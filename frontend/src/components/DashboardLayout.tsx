import { ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { 
  LayoutDashboard, 
  Receipt, 
  LogOut, 
  CreditCard,
  Menu,
  Shield,
  Globe
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from "@/components/ui/sheet";

interface DashboardLayoutProps {
  children: ReactNode;
}

export const DashboardLayout = ({ children }: DashboardLayoutProps) => {
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleSignOut = async () => {
    const { error } = await supabase.auth.signOut();
    
    if (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } else {
      navigate("/auth");
    }
  };

  const navigation = [
    { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { name: "Transactions", href: "/transactions", icon: Receipt },
    { name: "Web Scraping", href: "/scraping", icon: Globe },
    { name: "Admin", href: "/admin", icon: Shield },
  ];

  const NavLinks = ({ mobile = false }: { mobile?: boolean }) => (
    <nav className={cn("space-y-1", mobile ? "px-2 pt-2 pb-3" : "px-3")}>
      {navigation.map((item) => {
        const Icon = item.icon;
        const isActive = window.location.pathname === item.href;
        
        return (
          <Button
            key={item.name}
            variant={isActive ? "secondary" : "ghost"}
            className={cn(
              "w-full justify-start",
              isActive && "bg-secondary font-medium"
            )}
            onClick={() => navigate(item.href)}
          >
            <Icon className="mr-3 h-5 w-5" />
            {item.name}
          </Button>
        );
      })}
    </nav>
  );

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile header */}
      <div className="lg:hidden border-b bg-card">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center space-x-3">
            <img src="/logo-circle.png" alt="Logo" className="h-8 w-8 flex-shrink-0 rounded-full object-contain drop-shadow" />
            <span className="font-bold text-lg">Payment Tracker</span>
          </div>
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon">
                <Menu className="h-6 w-6" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-64 p-0">
              <div className="flex items-center space-x-3 p-5 border-b">
                <img src="/logo-circle.png" alt="Logo" className="h-9 w-9 flex-shrink-0 rounded-full object-contain drop-shadow" />
                <span className="font-bold text-lg">Payment Tracker</span>
              </div>
              <NavLinks mobile />
              <div className="absolute bottom-0 left-0 right-0 p-4 border-t">
                <Button 
                  variant="ghost" 
                  className="w-full justify-start text-destructive hover:text-destructive"
                  onClick={handleSignOut}
                >
                  <LogOut className="mr-3 h-5 w-5" />
                  Sign Out
                </Button>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>

      <div className="lg:flex">
        {/* Desktop sidebar */}
        <div className="hidden lg:flex lg:flex-col lg:w-64 lg:fixed lg:inset-y-0 border-r bg-card">
          <div className="flex items-center space-x-3 p-5 border-b">
            <img src="/logo-circle.png" alt="Logo" className="h-10 w-10 flex-shrink-0 rounded-full object-contain drop-shadow" />
            <span className="font-bold text-lg tracking-tight">Payment Tracker</span>
          </div>
          
          <div className="flex-1 flex flex-col justify-between py-4">
            <NavLinks />
            
            <div className="px-3">
              <Button 
                variant="ghost" 
                className="w-full justify-start text-destructive hover:text-destructive"
                onClick={handleSignOut}
              >
                <LogOut className="mr-3 h-5 w-5" />
                Sign Out
              </Button>
            </div>
          </div>
        </div>

        {/* Main content */}
        <div className="lg:pl-64 flex-1">
          <main className="p-4 sm:p-6 lg:p-8">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
};
