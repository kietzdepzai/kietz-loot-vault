import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function md5(message: string): Promise<string> {
  const msgUint8 = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest("MD5", msgUint8);
  return Array.from(new Uint8Array(hashBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    // Thesieure Credentials
    const TSR_PARTNER_ID = "13610068333";
    const TSR_PARTNER_KEY = Deno.env.get("TSR_PARTNER_KEY");

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { telco, code, serial, amount, user_id, topup_request_id } = await req.json();

    // Validate inputs
    if (!telco || !code || !serial || !amount || !user_id) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!TSR_PARTNER_KEY) {
      return new Response(
        JSON.stringify({ error: "TSR_PARTNER_KEY chưa được cấu hình" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const request_id = `TSR${Date.now()}${Math.floor(Math.random() * 100000)}`;

    // Tạo chữ ký cho Thesieure
    const sign = await md5(TSR_PARTNER_KEY + code + serial);

    const payload = {
      partner_id: TSR_PARTNER_ID,
      telco: telco.toLowerCase(),
      code: code.trim(),
      serial: serial.trim(),
      face_value: parseInt(amount),
      request_id: request_id,
      sign: sign,
    };

    // Gửi thẻ lên Thesieure
    const response = await fetch("https://thesieure.com/api/card", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams(payload as any),
    });

    const result = await response.json();

    console.log("Thesieure Response:", result);

    // Lưu hoặc cập nhật topup_request
    if (topup_request_id) {
      await supabase
        .from("topup_requests")
        .update({ 
          request_id,
          status: "pending",
          note: "Đã gửi lên Thesieure"
        })
        .eq("id", topup_request_id);
    } else {
      await supabase.from("topup_requests").insert({
        user_id,
        request_id,
        telco: telco.toLowerCase(),
        code: code.trim(),
        serial: serial.trim(),
        declared_value: parseInt(amount),
        status: "pending",
        note: "Đã gửi lên Thesieure",
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "Đã gửi thẻ thành công",
        request_id: request_id,
        tsr_response: result
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Charge card error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error", details: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
