import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { crypto } from "https://deno.land/std@0.168.0/crypto/mod.ts";
import { encode as hexEncode } from "https://deno.land/std@0.168.0/encoding/hex.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function md5(message: string): Promise<string> {
  const msgUint8 = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest("MD5", msgUint8);
  return new TextDecoder().decode(hexEncode(new Uint8Array(hashBuffer)));
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const TSR_PARTNER_KEY = Deno.env.get("TSR_PARTNER_KEY");

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    let data: Record<string, string> = {};
    const contentType = req.headers.get("content-type") || "";

    if (contentType.includes("application/x-www-form-urlencoded")) {
      const formData = await req.formData();
      formData.forEach((value, key) => { data[key] = value.toString(); });
    } else {
      const body = await req.text();
      if (body) {
        new URLSearchParams(body).forEach((value, key) => {
          data[key] = value;
        });
      }
    }

    console.log("Thesieure Callback:", data);

    const {
      status, request_id, declared_value, value, amount,
      code: card_code, serial: card_serial, telco, trans_id,
      callback_sign, message
    } = data;

    if (!request_id) {
      return new Response(JSON.stringify({ error: "Missing request_id" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // Kiểm tra chữ ký
    if (TSR_PARTNER_KEY && callback_sign && card_code && card_serial) {
      const expectedSign = await md5(TSR_PARTNER_KEY + card_code + card_serial);
      if (expectedSign !== callback_sign) {
        console.error("Invalid callback signature");
        return new Response(JSON.stringify({ error: "Invalid signature" }), {
          status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }
    }

    const { data: topupRequest, error: findError } = await supabase
      .from("topup_requests")
      .select("*")
      .eq("request_id", request_id)
      .single();

    if (findError || !topupRequest) {
      console.error("Request not found:", request_id);
      return new Response(JSON.stringify({ error: "Request not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    if (topupRequest.status !== "pending") {
      return new Response(JSON.stringify({ success: true, message: "Already processed" }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const cardStatus = parseInt(status || "0");
    const actualValue = parseInt(value || amount || "0");
    const declaredVal = parseInt(declared_value || "0");

    if (cardStatus === 1 || cardStatus === 2) {
      const creditAmount = Math.floor(actualValue * 0.8);

      const { data: profile } = await supabase
        .from("profiles")
        .select("balance")
        .eq("user_id", topupRequest.user_id)
        .single();

      if (profile) {
        await supabase
          .from("profiles")
          .update({ balance: profile.balance + creditAmount })
          .eq("user_id", topupRequest.user_id);
      }

      const resultNote = cardStatus === 2
        ? `Thẻ đúng nhưng sai mệnh giá (${declaredVal} → ${actualValue}). Cộng ${creditAmount}đ`
        : `Thẻ hợp lệ. Mệnh giá ${actualValue}. Cộng ${creditAmount}đ`;

      await supabase
        .from("topup_requests")
        .update({
          status: "approved",
          card_result: JSON.stringify({ ...data, credit_amount: creditAmount }),
          note: (topupRequest.note || "") + ` | ${resultNote}`,
          amount: actualValue,
        })
        .eq("id", topupRequest.id);

    } else {
      await supabase
        .from("topup_requests")
        .update({
          status: "rejected",
          card_result: JSON.stringify(data),
          note: (topupRequest.note || "") + ` | Thẻ không hợp lệ: ${message || "Thẻ sai hoặc đã sử dụng"}`,
        })
        .eq("id", topupRequest.id);
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" }
    });

  } catch (error) {
    console.error("TSR Callback Error:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});
