import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  CreditCard, 
  TrendingUp, 
  Shield, 
  Zap, 
  BarChart3, 
  Clock, 
  CheckCircle2,
  ArrowRight,
  Users,
  LineChart,
  Globe,
  Lock,
  Download,
  Sparkles
} from "lucide-react";

const Index = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState({ users: 0, transactions: 0 });

  useEffect(() => {
    // Fetch some stats for social proof
    const fetchStats = async () => {
      try {
        const { count: userCount } = await supabase
          .from("profiles")
          .select("*", { count: "exact", head: true });
        
        const { count: txCount } = await supabase
          .from("transactions")
          .select("*", { count: "exact", head: true });

        setStats({
          users: userCount || 0,
          transactions: txCount || 0,
        });
      } catch (error) {
        console.error("Error fetching stats:", error);
      }
    };

    fetchStats();
  }, []);

  const features = [
    {
      icon: TrendingUp,
      title: "Real-time Profit Tracking",
      description: "Monitor your commissions and profits with live updates and beautiful charts",
    },
    {
      icon: Shield,
      title: "Secure & Private",
      description: "Your financial data is encrypted and protected with enterprise-grade security",
    },
    {
      icon: Zap,
      title: "Instant Calculations",
      description: "Automatic calculation of withdrawals, repayments, commissions, and net profits",
    },
    {
      icon: BarChart3,
      title: "Analytics Dashboard",
      description: "Comprehensive insights with daily, weekly, and monthly summaries",
    },
    {
      icon: Clock,
      title: "Transaction History",
      description: "Complete transaction log with advanced filtering and CSV export",
    },
    {
      icon: CreditCard,
      title: "Multi-Portal Support",
      description: "Track transactions across PayMama, PaysWith, and other payment portals",
    },
  ];

  return (
    <div className="min-h-screen flex flex-col">
      {/* Navigation Header */}
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 flex-shrink-0 sticky top-0 z-50">
        <div className="container flex h-12 sm:h-14 items-center justify-between px-3 sm:px-4 lg:px-8">
          <div className="flex items-center space-x-2">
            <img src="/logo-circle.png" alt="Logo" className="h-7 w-7 rounded-full object-contain drop-shadow-sm" />
            <span className="font-bold text-sm sm:text-base">Payment Tracker</span>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => navigate("/auth?mode=signin")}
              className="h-9 px-3 text-xs sm:text-sm font-medium"
            >
              Sign In
            </Button>
            <Button
              size="sm"
              onClick={() => navigate("/auth?mode=signup")}
              className="gap-1.5 sm:gap-2 h-9 px-4 text-xs sm:text-sm font-medium touch-manipulation shadow-sm"
            >
              <span>Get Started</span>
              <ArrowRight className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content - Single Page */}
      <main className="flex-1 overflow-y-auto">
        <div className="relative min-h-[calc(100vh-3rem)] sm:min-h-[calc(100vh-3.5rem)] bg-gradient-to-br from-primary via-primary/90 to-primary/70 text-primary-foreground">
          <div className="absolute inset-0 bg-grid-white/10 [mask-image:linear-gradient(0deg,white,transparent)]" />
          
          <div className="container relative h-full mx-auto px-3 sm:px-4 lg:px-8 py-4 sm:py-6 lg:py-8">
            <div className="h-full flex flex-col justify-center max-w-6xl mx-auto">
              <div className="grid lg:grid-cols-2 gap-4 sm:gap-6 lg:gap-8 items-start lg:items-center">
                {/* Left Side - Hero Content */}
                <div className="text-center lg:text-left space-y-4 sm:space-y-5 lg:space-y-6">
                  <Badge className="bg-white/20 text-white hover:bg-white/30 border-white/30 inline-flex text-xs sm:text-sm px-2 sm:px-3 py-1">
                    <Sparkles className="mr-1.5 sm:mr-2 h-2.5 w-2.5 sm:h-3 sm:w-3" />
                    <span className="whitespace-nowrap">Trusted by {stats.users > 0 ? `${stats.users}+` : 'hundreds of'} businesses</span>
                  </Badge>
                  
                  <div className="space-y-3 sm:space-y-4">
                    <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight leading-tight">
                      Track Your Payment
                      <span className="block text-transparent bg-clip-text bg-gradient-to-r from-white to-white/70">
                        Profits Like a Pro
                      </span>
                    </h1>
                    <p className="text-base sm:text-lg lg:text-xl text-primary-foreground/90 max-w-xl lg:max-w-none mx-auto lg:mx-0 leading-relaxed px-2 sm:px-0">
                      The all-in-one platform for managing credit card transactions, commissions, and profits. 
                      Every user receives their own isolated private account with custom categories and real-time reports.
                    </p>
                  </div>
                  
                  <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                    <Button
                      size="lg"
                      onClick={() => navigate("/auth?mode=signup")}
                      className="bg-white text-primary hover:bg-white/95 shadow-xl font-semibold h-12 px-8 text-base group w-full sm:w-auto touch-manipulation active:scale-95 transition-transform"
                    >
                      <span>Create Free Account</span>
                      <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                    </Button>
                    <Button
                      size="lg"
                      variant="outline"
                      onClick={() => navigate("/auth?mode=signin")}
                      className="border-white/40 bg-white/10 hover:bg-white/20 text-white shadow-md font-semibold h-12 px-6 text-base w-full sm:w-auto touch-manipulation active:scale-95 transition-transform"
                    >
                      <span>Sign In</span>
                    </Button>
                  </div>

                  {/* Stats */}
                  <div className="grid grid-cols-3 gap-2 sm:gap-3 lg:gap-4 pt-3 sm:pt-4 border-t border-white/20">
                    <div className="text-center lg:text-left">
                      <div className="text-lg sm:text-xl lg:text-2xl font-bold">{stats.users > 0 ? `${stats.users}+` : '500+'}</div>
                      <div className="text-[10px] sm:text-xs text-primary-foreground/70 mt-0.5">Users</div>
                    </div>
                    <div className="text-center lg:text-left">
                      <div className="text-lg sm:text-xl lg:text-2xl font-bold">{stats.transactions > 0 ? `${(stats.transactions / 1000).toFixed(1)}K+` : '10K+'}</div>
                      <div className="text-[10px] sm:text-xs text-primary-foreground/70 mt-0.5">Transactions</div>
                    </div>
                    <div className="text-center lg:text-left">
                      <div className="text-lg sm:text-xl lg:text-2xl font-bold">99.9%</div>
                      <div className="text-[10px] sm:text-xs text-primary-foreground/70 mt-0.5">Uptime</div>
                    </div>
                  </div>
                </div>

                {/* Right Side - Features Grid */}
                <div className="grid grid-cols-2 gap-2 sm:gap-2.5 lg:gap-3 mt-6 lg:mt-0">
                  {features.slice(0, 4).map((feature, index) => {
                    const Icon = feature.icon;
                    return (
                      <Card
                        key={index}
                        className="p-2.5 sm:p-3 lg:p-4 bg-background/80 backdrop-blur-sm border-white/20 hover:bg-background/90 active:bg-background/95 transition-all duration-200 group touch-manipulation"
                      >
                        <div className="mb-2 sm:mb-2.5 lg:mb-3 inline-flex p-1.5 sm:p-2 bg-primary/20 rounded-lg group-hover:bg-primary/30 transition-colors">
                          <Icon className="h-3.5 w-3.5 sm:h-4 sm:w-4 lg:h-5 lg:w-5 text-primary-foreground" />
                        </div>
                        <h3 className="text-[11px] sm:text-xs lg:text-sm font-semibold mb-1 sm:mb-1.5 text-foreground leading-tight line-clamp-2">{feature.title}</h3>
                        <p className="text-[9px] sm:text-[10px] lg:text-xs text-muted-foreground leading-relaxed line-clamp-2 sm:line-clamp-3">{feature.description}</p>
                      </Card>
                    );
                  })}
                </div>
              </div>

              {/* Quick Benefits */}
              <div className="mt-4 sm:mt-6 lg:mt-8 pt-4 sm:pt-6 lg:pt-8 border-t border-white/20">
                <div className="flex flex-wrap justify-center gap-2 sm:gap-3 lg:gap-4 xl:gap-6 text-[10px] sm:text-xs lg:text-sm">
                  {[
                    "Real-time Analytics",
                    "Secure & Encrypted",
                    "Multi-Portal Support",
                    "Automated Tracking",
                    "CSV Export",
                    "Mobile Responsive",
                  ].map((benefit, index) => (
                    <div key={index} className="flex items-center gap-1 sm:gap-1.5 lg:gap-2">
                      <CheckCircle2 className="h-3 w-3 sm:h-3.5 sm:w-3.5 lg:h-4 lg:w-4 text-primary-foreground/70 flex-shrink-0" />
                      <span className="text-primary-foreground/90 whitespace-nowrap">{benefit}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Compact Footer */}
      <footer className="border-t bg-card flex-shrink-0 py-3 sm:py-4">
        <div className="container mx-auto px-3 sm:px-4 lg:px-8">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-2 sm:gap-3 text-[10px] sm:text-xs lg:text-sm">
            <div className="flex items-center space-x-1.5 sm:space-x-2 flex-wrap justify-center">
              <CreditCard className="h-3 w-3 sm:h-4 sm:w-4 text-primary" />
              <span className="font-semibold">Payment Tracker</span>
              <span className="text-muted-foreground">© 2025</span>
            </div>
            <div className="flex gap-3 sm:gap-4 text-muted-foreground flex-wrap justify-center">
              <a href="#" className="hover:text-foreground transition-colors">Privacy</a>
              <a href="#" className="hover:text-foreground transition-colors">Terms</a>
              <a href="#" className="hover:text-foreground transition-colors">Support</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
