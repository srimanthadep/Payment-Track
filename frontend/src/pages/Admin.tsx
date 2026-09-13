import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { AdminUsers } from "@/components/admin/AdminUsers";
import { AdminTransactions } from "@/components/admin/AdminTransactions";
import { AdminPortals } from "@/components/admin/AdminPortals";
import { AdminStats } from "@/components/admin/AdminStats";
import { AdminLeaderboard } from "@/components/admin/AdminLeaderboard";
import { useToast } from "@/hooks/use-toast";

const Admin = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAdminAccess();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const checkAdminAccess = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/auth");
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .maybeSingle();

      if (profile?.role !== "admin") {
        toast({
          title: "Access Denied",
          description: "You need admin privileges to access this page",
          variant: "destructive",
        });
        navigate("/");
        return;
      }

      setIsAdmin(true);
    } catch (error) {
      console.error("Error checking admin access:", error);
      navigate("/");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center space-y-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="text-sm text-muted-foreground">Checking permissions...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <DashboardLayout>
      <div className="space-y-4 sm:space-y-6">
        <div className="space-y-2">
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight">Admin Dashboard</h1>
          <p className="text-xs sm:text-sm text-muted-foreground">Manage users, transactions, and portals</p>
        </div>

        <AdminStats />

        <Tabs defaultValue="overview" className="space-y-3 sm:space-y-4">
          <TabsList className="grid grid-cols-4 w-full">
            <TabsTrigger value="overview" className="text-xs sm:text-sm">Overview</TabsTrigger>
            <TabsTrigger value="users" className="text-xs sm:text-sm">Users</TabsTrigger>
            <TabsTrigger value="transactions" className="text-xs sm:text-sm">Transactions</TabsTrigger>
            <TabsTrigger value="portals" className="text-xs sm:text-sm">Portals</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <AdminLeaderboard />

            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Quick Actions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <p className="text-sm text-muted-foreground">
                    Manage your platform from the tabs above. Use the Overview tab to see key statistics and leaderboard,
                    Users tab to manage user accounts and roles, Transactions tab to view and manage all transactions,
                    and Portals tab to configure payment portals.
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Platform Health</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Active Portals</span>
                    <Badge variant="default">Active</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">System Status</span>
                    <Badge variant="default">Operational</Badge>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="users">
            <Card>
              <CardHeader>
                <CardTitle>User Management</CardTitle>
              </CardHeader>
              <CardContent>
                <AdminUsers />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="transactions">
            <Card>
              <CardHeader>
                <CardTitle>All Transactions</CardTitle>
              </CardHeader>
              <CardContent>
                <AdminTransactions />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="portals">
            <Card>
              <CardHeader>
                <CardTitle>Portal Management</CardTitle>
              </CardHeader>
              <CardContent>
                <AdminPortals />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default Admin;
