import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Shield, ClipboardList, BarChart3, LogOut, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import DailyArmsRegister from "@/components/DailyArmsRegister";
import { supabase } from "@/lib/supabase";

const Dashboard = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<{ serviceNumber: string; name: string } | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeTab, setActiveTab] = useState("register");

  useEffect(() => {
    const getSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/");
        return;
      }

      setUser({
        name: session.user.user_metadata.name || session.user.email,
        serviceNumber: session.user.user_metadata.service_number || "N/A"
      });
    };

    getSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        navigate("/");
      } else {
        setUser({
          name: session.user.user_metadata.name || session.user.email,
          serviceNumber: session.user.user_metadata.service_number || "N/A"
        });
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  if (!user) return null;

  const navItems = [
    { id: "register", label: "Arms Register", icon: ClipboardList },
    { id: "stats", label: "Statistics", icon: BarChart3 },
  ];

  return (
    <div className="min-h-screen flex bg-background">
      {/* Sidebar */}
      <aside
        className={`${sidebarOpen ? "w-60" : "w-0 overflow-hidden"
          } transition-all duration-200 bg-sidebar flex flex-col border-r border-sidebar-border`}
      >
        {/* Logo */}
        <div className="p-4 flex items-center gap-3 border-b border-sidebar-border">
          <div className="w-10 h-10 flex items-center justify-center">
            <img src="/logoaa.png" alt="Logo" className="w-full h-full object-contain" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-bold text-sidebar-foreground truncate">AHQ SIG BN</p>
            <p className="text-xs text-sidebar-foreground/70">Armoury System</p>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-3 space-y-1">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors ${activeTab === item.id
                ? "bg-sidebar-accent text-sidebar-accent-foreground"
                : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
                }`}
            >
              <item.icon className="w-4 h-4 shrink-0" />
              <span>{item.label}</span>
            </button>
          ))}
        </nav>

        {/* User Info */}
        <div className="p-4 border-t border-sidebar-border">
          <div className="text-xs text-sidebar-foreground/70">Logged in as</div>
          <div className="text-sm font-semibold text-sidebar-foreground truncate">{user.name}</div>
          <div className="text-xs text-sidebar-foreground/60">{user.serviceNumber}</div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleLogout}
            className="mt-3 w-full border-sidebar-border text-sidebar-foreground hover:bg-sidebar-accent"
          >
            <LogOut className="w-3.5 h-3.5 mr-2" />
            Sign Out
          </Button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="h-14 border-b border-border bg-card flex items-center px-4 gap-4 shrink-0">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-1.5 rounded-md hover:bg-muted text-foreground"
          >
            <Menu className="w-5 h-5" />
          </button>
          <h1 className="text-base font-semibold text-foreground">
            {activeTab === "register" ? "Daily Arms Issue Register" : "Statistics"}
          </h1>
        </header>

        {/* Content */}
        <main className="flex-1 p-6 overflow-auto">
          {activeTab === "register" && <DailyArmsRegister />}
          {activeTab === "stats" && (
            <div className="flex items-center justify-center h-64 text-muted-foreground">
              <p>Statistics module — coming soon</p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default Dashboard;
