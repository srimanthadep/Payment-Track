import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Shield, ShieldOff } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AddUserDialog } from "@/components/admin/AddUserDialog";

interface UserWithRole {
  id: string;
  email: string | null;
  full_name: string | null;
  business_name: string | null;
  avatar_url: string | null;
  created_at: string;
  role: "admin" | "user" | "staff";
  is_admin: boolean;
}

export const AdminUsers = () => {
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<UserWithRole | null>(null);
  const [editForm, setEditForm] = useState<{
    full_name: string;
    business_name: string;
    email: string;
    role: "admin" | "user" | "staff";
  }>({ full_name: "", business_name: "", email: "", role: "user" });
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [addOpen, setAddOpen] = useState(false);

  useEffect(() => {
    fetchUsers();

    const channel = supabase
      .channel("admin-users-live")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "profiles",
        },
        () => {
          fetchUsers();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchUsers = async () => {
    try {
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("id, full_name, email, business_name, avatar_url, role, created_at")
        .order("created_at", { ascending: false });

      if (profilesError) throw profilesError;

      const usersWithRoles: UserWithRole[] = (profiles || []).map((profile) => ({
        ...profile,
        role: (profile.role as "admin" | "user" | "staff") || "user",
        is_admin: profile.role === "admin",
      }));

      setUsers(usersWithRoles);
    } catch (error) {
      console.error("Error fetching users:", error);
      toast({
        title: "Error",
        description: "Failed to fetch users",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const toggleAdminRole = async (userId: string, isCurrentlyAdmin: boolean) => {
    try {
      const newRole = isCurrentlyAdmin ? "user" : "admin";
      const { error } = await supabase
        .from("profiles")
        .update({ role: newRole })
        .eq("id", userId);

      if (error) throw error;

      toast({
        title: "Success",
        description: `Admin role ${isCurrentlyAdmin ? "removed" : "added"}`,
      });

      fetchUsers();
    } catch (error: any) {
      console.error("Error toggling admin role:", error);
      toast({
        title: "Error",
        description: error?.message || "Failed to update role",
        variant: "destructive",
      });
    }
  };

  const startEdit = (u: UserWithRole) => {
    setEditing(u);
    setEditForm({
      full_name: u.full_name || "",
      business_name: u.business_name || "",
      email: u.email || "",
      role: u.role || "user",
    });
  };

  const saveEdit = async () => {
    if (!editing) return;
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const currentAdminId = session?.user?.id || null;
      const updatePayload: any = {
        full_name: editForm.full_name,
        business_name: editForm.business_name,
        email: editForm.email,
        role: editForm.role,
      };
      if (editForm.role === "staff" && currentAdminId) {
        updatePayload.owner_id = currentAdminId;
      }

      const { error } = await supabase
        .from("profiles")
        .update(updatePayload)
        .eq("id", editing.id);
      if (error) throw error;
      toast({ title: "Saved", description: "User profile updated" });
      setEditing(null);
      fetchUsers();
    } catch (e) {
      const error = e as Error;
      toast({ title: "Error", description: error.message || "Failed to update user", variant: "destructive" });
    }
  };

  const inviteUser = async () => {
    try {
      if (!inviteEmail) { toast({ title: "Email required", variant: "destructive" }); return; }
      const { error } = await supabase.auth.signInWithOtp({ email: inviteEmail });
      if (error) throw error;
      toast({ title: "Invitation sent", description: "Magic link sent if email auth is enabled." });
      setInviteOpen(false);
      setInviteEmail("");
    } catch (e) {
      const error = e as Error;
      toast({ title: "Invite failed", description: error.message || "Email auth may be disabled", variant: "destructive" });
    }
  };

  if (loading) {
    return <p className="text-muted-foreground">Loading users...</p>;
  }

  const filtered = users.filter((u) =>
    [u.email, u.full_name].some((x) =>
      (x || "").toLowerCase().includes(search.toLowerCase())
    )
  );

  return (
    <>
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row gap-2">
          <Input 
            placeholder="Search users" 
            value={search} 
            onChange={(e) => setSearch(e.target.value)} 
            className="w-full sm:max-w-xs text-sm h-9" 
          />
          <div className="flex gap-2">
            <Button className="flex-1 sm:flex-none text-sm h-9" onClick={() => setAddOpen(true)}>Add new user</Button>
            <Button className="flex-1 sm:flex-none text-sm h-9" variant="outline" onClick={() => setInviteOpen(true)}>Invite by email</Button>
          </div>
        </div>
        <div className="rounded-md border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs sm:text-sm">Email</TableHead>
                <TableHead className="text-xs sm:text-sm hidden sm:table-cell">Name</TableHead>
                <TableHead className="text-xs sm:text-sm">Role</TableHead>
                <TableHead className="text-xs sm:text-sm hidden lg:table-cell">Joined</TableHead>
                <TableHead className="text-xs sm:text-sm text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium text-xs sm:text-sm">
                    <div className="truncate max-w-[150px] sm:max-w-none">{user.email}</div>
                    <div className="text-[10px] text-muted-foreground sm:hidden mt-0.5">{user.full_name || "-"}</div>
                  </TableCell>
                  <TableCell className="text-xs sm:text-sm hidden sm:table-cell">{user.full_name || "-"}</TableCell>
                  <TableCell>
                    {user.role === "admin" ? (
                      <Badge className="text-[10px] sm:text-xs">Admin</Badge>
                    ) : user.role === "staff" ? (
                      <Badge variant="outline" className="text-[10px] sm:text-xs border-amber-500/30 text-amber-500 bg-amber-500/10">Staff</Badge>
                    ) : (
                      <Badge variant="secondary" className="text-[10px] sm:text-xs">User</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-xs sm:text-sm hidden lg:table-cell">
                    {new Date(user.created_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => toggleAdminRole(user.id, user.is_admin)}
                        className="h-7 w-7"
                        title={user.is_admin ? "Demote to user" : "Promote to admin"}
                      >
                        {user.is_admin ? (
                          <ShieldOff className="h-3.5 w-3.5" />
                        ) : (
                          <Shield className="h-3.5 w-3.5" />
                        )}
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => startEdit(user)} className="h-7 text-xs px-2">Edit</Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit user</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Modify user role, full name, or business credentials.
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 gap-3">
            <div className="space-y-1"><Label>Full name</Label><Input value={editForm.full_name} onChange={(e) => setEditForm({ ...editForm, full_name: e.target.value })} /></div>
            <div className="space-y-1"><Label>Business name</Label><Input value={editForm.business_name} onChange={(e) => setEditForm({ ...editForm, business_name: e.target.value })} /></div>
            <div className="space-y-1"><Label>Email (profile)</Label><Input value={editForm.email} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} /></div>
            <div className="space-y-1">
              <Label>Role</Label>
              <Select
                value={editForm.role}
                onValueChange={(val: "admin" | "user" | "staff") => setEditForm({ ...editForm, role: val })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="user">User (Standard)</SelectItem>
                  <SelectItem value="staff">Staff (Restricted)</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
            <Button onClick={saveEdit}>Save</Button>
          </div>
        </DialogContent>
      </Dialog>

    <AddUserDialog open={addOpen} onOpenChange={setAddOpen} onCreated={fetchUsers} />

      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invite user by email</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Send an invitation to join this Payment Tracker workspace.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label>Email</Label>
            <Input type="email" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} placeholder="user@example.com" />
            <p className="text-xs text-muted-foreground">Sends a magic-link sign-in email if email auth is enabled.</p>
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setInviteOpen(false)}>Cancel</Button>
            <Button onClick={inviteUser}>Send Invite</Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
