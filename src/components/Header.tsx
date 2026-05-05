import { Search, ShoppingCart, User, Gamepad2, ChevronDown, LogOut, Wallet, Shield, Phone, Mail, CreditCard, History as HistoryIcon, FileText, HelpCircle, Home, Package, Landmark, Smartphone, Menu, X } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import ThemeToggle from "./ThemeToggle";
import AnimatedLogo from "./AnimatedLogo";

const Header = () => {
  const { user, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const currentPath = location.pathname;
  const [searchQuery, setSearchQuery] = useState("");
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [topupOpen, setTopupOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isCTV, setIsCTV] = useState(false);
  const [balance, setBalance] = useState<number | null>(null);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const topupRef = useRef<HTMLDivElement>(null);
  const historyRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    supabase.from("shop_settings").select("key,value").eq("key", "shop_logo_url").maybeSingle().then(({ data }) => {
      if (data?.value) setLogoUrl(data.value);
    });
  }, []);

  useEffect(() => {
    if (!user) { setIsAdmin(false); setIsCTV(false); setBalance(null); return; }
    supabase.from("user_roles").select("role").eq("user_id", user.id).eq("role", "admin").then(({ data }) => {
      setIsAdmin(!!(data && data.length > 0));
    });
    supabase.from("ctv_assignments").select("id").eq("is_active", true).then(({ data }) => {
      setIsCTV(!!(data && data.length > 0));
    });
    supabase.from("profiles").select("balance").eq("user_id", user.id).single().then(({ data }) => {
      setBalance(data?.balance ?? 0);
    });
  }, [user]);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) setUserMenuOpen(false);
      if (topupRef.current && !topupRef.current.contains(e.target as Node)) setTopupOpen(false);
      if (historyRef.current && !historyRef.current.contains(e.target as Node)) setHistoryOpen(false);
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) navigate(`/?search=${encodeURIComponent(searchQuery.trim())}`);
  };

  const displayName = user?.user_metadata?.full_name || user?.email?.split("@")[0] || "User";

  const isHistoryActive = ["/lich-su-nap", "/lich-su-mua", "/bien-dong-so-du", "/lich-su"].some(p => currentPath.startsWith(p));
  const isTopupActive = currentPath.startsWith("/nap-tien");

  return (
    <header className="bg-card border-b border-border sticky top-0 z-50">
      <div className="border-b border-border/50 bg-muted/30">
        <div className="container mx-auto px-4 py-1.5 flex items-center justify-between">
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <a href="https://discord.gg/shopkietz" target="_blank" rel="noopener" className="flex items-center gap-1 hover:text-primary transition-colors">
              <Phone className="w-3 h-3" /> Discord: dsc.gg/f6hv3j
            </a>
            <span className="hidden sm:flex items-center gap-1">
              <Mail className="w-3 h-3" /> support@shopkietz.com
            </span>
          </div>
          <ThemeToggle />
        </div>
      </div>

      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-between gap-3 sm:gap-4">
          <a href="/" className="flex items-center gap-2 shrink-0 min-w-0">
            {logoUrl ? (
              <img src={logoUrl} alt="Logo" className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg object-contain shrink-0" />
            ) : (
              <Gamepad2 className="w-9 h-9 sm:w-10 sm:h-10 text-primary neon-text animate-spin-slow shrink-0" />
            )}
            <AnimatedLogo />
          </a>

          <form onSubmit={handleSearch} className="flex-1 max-w-xl hidden md:block">
            <div className="relative">
              <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Tìm kiếm sản phẩm..."
                className="w-full bg-muted border border-border rounded-lg py-2.5 pl-4 pr-12 text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:neon-border transition-all" />
              <button type="submit" className="absolute right-1 top-1 bottom-1 px-3 gradient-primary rounded-md flex items-center justify-center hover:opacity-90 transition-opacity">
                <Search className="w-4 h-4 text-primary-foreground" />
              </button>
            </div>
          </form>

          <div className="flex items-center gap-2 sm:gap-3">
            {user ? (
              <div className="relative" ref={userMenuRef}>
                <button onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="flex items-center gap-2 px-2 sm:px-3 py-2 bg-muted border border-border rounded-lg hover:bg-border transition-colors">
                  <div className="w-7 h-7 rounded-full gradient-primary flex items-center justify-center text-primary-foreground text-xs font-bold">
                    {displayName.charAt(0).toUpperCase()}
                  </div>
                  <span className="hidden sm:inline text-sm font-medium text-foreground max-w-[100px] truncate">{displayName}</span>
                  <ChevronDown className={`w-3 h-3 text-muted-foreground transition-transform ${userMenuOpen ? "rotate-180" : ""}`} />
                </button>
                {userMenuOpen && (
                  <div className="absolute top-full right-0 mt-1 bg-card border border-border rounded-lg shadow-lg py-1 min-w-[220px] z-50 animate-fade-in">
                    <div className="px-4 py-2.5 border-b border-border">
                      <p className="text-sm font-medium text-foreground">{displayName}</p>
                      <p className="text-xs text-muted-foreground">{user.email}</p>
                      {balance !== null && (
                        <div className="mt-2 bg-primary/10 border border-primary/20 rounded-md px-3 py-1.5">
                          <p className="text-xs font-bold text-primary">💰 Số dư: <span className="text-yellow-500">{balance.toLocaleString("vi-VN")}đ</span></p>
                        </div>
                      )}
                    </div>
                    <a href="/trang-ca-nhan" className="flex items-center gap-2 px-4 py-2.5 text-sm text-foreground hover:bg-muted transition-colors">
                      <User className="w-4 h-4" /> Trang cá nhân
                    </a>
                    <a href="/lich-su-mua" className="flex items-center gap-2 px-4 py-2.5 text-sm text-foreground hover:bg-muted transition-colors">
                      <ShoppingCart className="w-4 h-4" /> Đơn hàng của tôi
                    </a>
                    {isAdmin && (
                      <a href="/admin" className="flex items-center gap-2 px-4 py-2.5 text-sm text-neon-orange hover:bg-muted transition-colors">
                        <Shield className="w-4 h-4" /> Admin Panel
                      </a>
                    )}
                    {isCTV && !isAdmin && (
                      <a href="/ctv" className="flex items-center gap-2 px-4 py-2.5 text-sm text-primary hover:bg-muted transition-colors">
                        <Package className="w-4 h-4" /> CTV
                      </a>
                    )}
                    <div className="border-t border-border mt-1">
                      <button onClick={() => { signOut(); setUserMenuOpen(false); }}
                        className="flex items-center gap-2 w-full px-4 py-2.5 text-sm text-destructive hover:bg-muted transition-colors">
                        <LogOut className="w-4 h-4" /> Đăng xuất
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <a href="/dang-nhap" className="flex items-center gap-2 px-3 sm:px-4 py-2 gradient-primary rounded-lg font-semibold text-sm text-primary-foreground hover:opacity-90 transition-opacity">
                <User className="w-4 h-4" />
                <span className="hidden sm:inline">Đăng nhập</span>
              </a>
            )}
            <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="md:hidden p-2 rounded-lg bg-muted border border-border">
              {mobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Nav with dropdowns */}
        <nav className={`mt-3 ${mobileMenuOpen ? "flex flex-col" : "hidden"} md:flex md:flex-row md:items-center gap-2 pb-1 relative z-40`}>
          {user && (
            <button
              onClick={() => navigate("/nap-tien")}
              className="flex items-center gap-2 px-3 py-2 rounded-lg border-2 border-primary bg-primary/5 hover:bg-primary/10 transition-colors shrink-0"
              title="Nạp tiền"
            >
              <Wallet className="w-4 h-4 text-primary" />
              <span className="text-xs font-semibold text-primary whitespace-nowrap">
                Ví: <span className="text-yellow-500 font-bold">{(balance ?? 0).toLocaleString("vi-VN")}đ</span>
              </span>
            </button>
          )}

          <button onClick={() => navigate("/")} className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${currentPath === "/" ? "gradient-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground hover:bg-muted"}`}>
            <Home className="w-4 h-4" /> Trang chủ
          </button>

          {/* Nạp tiền dropdown */}
          <div className="relative" ref={topupRef}>
            <button onClick={() => setTopupOpen(!topupOpen)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${isTopupActive ? "gradient-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground hover:bg-muted"}`}>
              <CreditCard className="w-4 h-4" /> Nạp tiền
              <ChevronDown className={`w-3 h-3 transition-transform ${topupOpen ? "rotate-180" : ""}`} />
            </button>
            {topupOpen && (
              <div className="absolute top-full left-0 mt-1 bg-card border border-border rounded-lg shadow-lg py-1 min-w-[200px] z-[100] animate-fade-in">
                <div className="px-3 py-2 border-b border-border flex items-center gap-2 text-primary font-bold text-xs">
                  <Landmark className="w-4 h-4" /> Chọn phương thức nạp
                </div>
                <button onClick={() => { navigate("/nap-tien?method=bank"); setTopupOpen(false); }}
                  className="flex items-center gap-2 w-full px-4 py-2.5 text-sm text-foreground hover:bg-muted transition-colors">
                  <Landmark className="w-4 h-4 text-primary" /> Ngân hàng
                </button>
                <button onClick={() => { navigate("/nap-tien?method=card"); setTopupOpen(false); }}
                  className="flex items-center gap-2 w-full px-4 py-2.5 text-sm text-foreground hover:bg-muted transition-colors">
                  <Smartphone className="w-4 h-4 text-accent" /> Thẻ cào
                </button>
                <button onClick={() => { navigate("/nap-tien?method=ewallet"); setTopupOpen(false); }}
                  className="flex items-center gap-2 w-full px-4 py-2.5 text-sm text-foreground hover:bg-muted transition-colors">
                  <Wallet className="w-4 h-4 text-primary" /> Ví điện tử
                </button>
              </div>
            )}
          </div>

          {/* Lịch sử dropdown */}
          <div className="relative" ref={historyRef}>
            <button onClick={() => setHistoryOpen(!historyOpen)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${isHistoryActive ? "gradient-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground hover:bg-muted"}`}>
              <HistoryIcon className="w-4 h-4" /> Lịch sử
              <ChevronDown className={`w-3 h-3 transition-transform ${historyOpen ? "rotate-180" : ""}`} />
            </button>
            {historyOpen && (
              <div className="absolute top-full left-0 mt-1 bg-card border border-border rounded-lg shadow-lg py-1 min-w-[220px] z-[100] animate-fade-in">
                <button onClick={() => { navigate("/lich-su-mua"); setHistoryOpen(false); }}
                  className="flex items-center gap-2 w-full px-4 py-2.5 text-sm text-foreground hover:bg-muted transition-colors">
                  <ShoppingCart className="w-4 h-4 text-primary" /> LSMH - Lịch sử mua hàng
                </button>
                <button onClick={() => { navigate("/lich-su-nap"); setHistoryOpen(false); }}
                  className="flex items-center gap-2 w-full px-4 py-2.5 text-sm text-foreground hover:bg-muted transition-colors">
                  <Wallet className="w-4 h-4 text-primary" /> LSNT - Lịch sử nạp tiền
                </button>
                <button onClick={() => { navigate("/bien-dong-so-du"); setHistoryOpen(false); }}
                  className="flex items-center gap-2 w-full px-4 py-2.5 text-sm text-foreground hover:bg-muted transition-colors">
                  <FileText className="w-4 h-4 text-primary" /> BDSD - Biến động số dư
                </button>
              </div>
            )}
          </div>

          <button onClick={() => navigate("/quy-dinh-nap-the")} className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${currentPath.startsWith("/quy-dinh-nap-the") ? "gradient-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground hover:bg-muted"}`}>
            <FileText className="w-4 h-4" /> Quy định nạp thẻ
          </button>
          <button onClick={() => navigate("/faq")} className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${currentPath.startsWith("/faq") ? "gradient-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground hover:bg-muted"}`}>
            <HelpCircle className="w-4 h-4" /> FAQ
          </button>
        </nav>
      </div>
    </header>
  );
};

export default Header;
