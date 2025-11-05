import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Shield, ShieldOff } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AddUserDialog } from "@/components/admin/AddUserDialog";

interface UserWithRole {
  id: string;
  email: string;
  full_name: string;
  phone_number: string;
  created_at: string;
  is_admin: boolean;
}

export const AdminUsers = () => {
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<any | null>(null);
  const [editForm, setEditForm] = useState({ full_name: "", phone_number: "", business_name: "", email: "" });
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [addOpen, setAddOpen] = useState(false);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false });

      if (profilesError) throw profilesError;

      // Get roles for each user
      const usersWithRoles = await Promise.all(
        (profiles || []).map(async (profile: any) => {
          const { data: roles } = await supabase
            .from("user_roles")
            .select("role")
            .eq("user_id", profile.id)
            .eq("role", "admin")
            .maybeSingle();

          return {
            ...profile,
            is_admin: !!roles,
          } as UserWithRole;
        })
      );

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
      if (isCurrentlyAdmin) {
        // Remove admin role
        await supabase
          .from("user_roles")
          .delete()
          .eq("user_id", userId)
          .eq("role", "admin");
      } else {
        // Add admin role
        await supabase
          .from("user_roles")
          .insert({ user_id: userId, role: "admin" });
      }

      toast({
        title: "Success",
        description: `Admin role ${isCurrentlyAdmin ? "removed" : "added"}`,
      });

      fetchUsers();
    } catch (error) {
      console.error("Error toggling admin role:", error);
      toast({
        title: "Error",
        description: "Failed to update role",
        variant: "destructive",
      });
    }
  };

  const startEdit = (u: any) => {
    setEditing(u);
    setEditForm({
      full_name: u.full_name || "",
      phone_number: u.phone_number || "",
      business_name: u.business_name || "",
      email: u.email || "",
    });
  };

  const saveEdit = async () => {
    if (!editing) return;
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: editForm.full_name,
          phone_number: editForm.phone_number,
          business_name: editForm.business_name,
          email: editForm.email,
        })
        .eq("id", editing.id);
      if (error) throw error;
      toast({ title: "Saved", description: "User profile updated" });
      setEditing(null);
      fetchUsers();
    } catch (e: any) {
      toast({ title: "Error", description: e.message || "Failed to update user", variant: "destructive" });
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
    } catch (e: any) {
      toast({ title: "Invite failed", description: e.message || "Email auth may be disabled", variant: "destructive" });
    }
  };

  if (loading) {
    return <p className="text-muted-foreground">Loading users...</p>;
  }

  const filtered = users.filter((u) =>
    [u.email, (u as any).full_name, (u as any).phone_number].some((x) =>
      (x || "").toLowerCase().includes(search.toLowerCase())
    )
  );

  return (
    <>
      <div className="flex flex-wrap gap-2 justify-between items-center mb-3">
        <Input placeholder="Search users" value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-xs flex-1 min-w-[200px]" />
        <div className="flex gap-2 w-full sm:w-auto justify-end">
          <Button className="w-full sm:w-auto" onClick={() => setAddOpen(true)}>Add new user</Button>
          <Button className="w-full sm:w-auto" variant="outline" onClick={() => setInviteOpen(true)}>Invite by email</Button>
        </div>
      </div>
    <div className="rounded-md border overflow-x-auto">
    <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Email</TableHead>
            <TableHead>Name</TableHead>
            <TableHead>Phone</TableHead>
            <TableHead>Role</TableHead>
            <TableHead>Joined</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filtered.map((user) => (
            <TableRow key={user.id}>
              <TableCell className="font-medium">{user.email}</TableCell>
              <TableCell>{user.full_name || "-"}</TableCell>
              <TableCell>{user.phone_number || "-"}</TableCell>
              <TableCell>
                {user.is_admin ? (
                  <Badge>Admin</Badge>
                ) : (
                  <Badge variant="secondary">User</Badge>
                )}
              </TableCell>
              <TableCell>
                {new Date(user.created_at).toLocaleDateString()}
              </TableCell>
              <TableCell className="space-x-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => toggleAdminRole(user.id, user.is_admin)}
                >
                  {user.is_admin ? (
                    <ShieldOff className="h-4 w-4" />
                  ) : (
                    <Shield className="h-4 w-4" />
                  )}
                </Button>
                <Button variant="ghost" size="sm" onClick={() => startEdit(user)}>Edit</Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
    </Table>
    </div>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit user</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1"><Label>Full name</Label><Input value={editForm.full_name} onChange={(e) => setEditForm({ ...editForm, full_name: e.target.value })} /></div>
            <div className="space-y-1"><Label>Phone</Label><Input value={editForm.phone_number} onChange={(e) => setEditForm({ ...editForm, phone_number: e.target.value })} /></div>
            <div className="space-y-1 col-span-2"><Label>Business name</Label><Input value={editForm.business_name} onChange={(e) => setEditForm({ ...editForm, business_name: e.target.value })} /></div>
            <div className="space-y-1 col-span-2"><Label>Email (profile)</Label><Input value={editForm.email} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} /></div>
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
