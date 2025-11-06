import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Trash2, Edit, Plus, ToggleLeft, ToggleRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

interface Portal {
  id: string;
  name: string;
  default_commission_rate: number;
  default_site_fee: number;
  is_active: boolean;
  created_at: string;
}

export const AdminPortals = () => {
  const [portals, setPortals] = useState<Portal[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [portalToDelete, setPortalToDelete] = useState<string | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editingPortal, setEditingPortal] = useState<Portal | null>(null);
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    name: "",
    default_commission_rate: "",
    default_site_fee: "",
    is_active: true,
  });

  useEffect(() => {
    fetchPortals();
  }, []);

  const fetchPortals = async () => {
    try {
      const { data, error } = await supabase
        .from("portals")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setPortals(data || []);
    } catch (error) {
      console.error("Error fetching portals:", error);
      toast({
        title: "Error",
        description: "Failed to fetch portals",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEditClick = (portal: Portal) => {
    setEditingPortal(portal);
    setFormData({
      name: portal.name,
      default_commission_rate: portal.default_commission_rate.toString(),
      default_site_fee: portal.default_site_fee.toString(),
      is_active: portal.is_active,
    });
    setEditDialogOpen(true);
  };

  const handleAddClick = () => {
    setEditingPortal(null);
    setFormData({
      name: "",
      default_commission_rate: "",
      default_site_fee: "",
      is_active: true,
    });
    setAddDialogOpen(true);
  };

  const handleSave = async () => {
    try {
      const data = {
        name: formData.name,
        default_commission_rate: parseFloat(formData.default_commission_rate),
        default_site_fee: parseFloat(formData.default_site_fee),
        is_active: formData.is_active,
      };

      if (editingPortal) {
        const { error } = await supabase
          .from("portals")
          .update(data)
          .eq("id", editingPortal.id);

        if (error) throw error;

        toast({
          title: "Success",
          description: "Portal updated successfully",
        });
        setEditDialogOpen(false);
      } else {
        const { error } = await supabase
          .from("portals")
          .insert(data);

        if (error) throw error;

        toast({
          title: "Success",
          description: "Portal created successfully",
        });
        setAddDialogOpen(false);
      }

      fetchPortals();
    } catch (error: any) {
      console.error("Error saving portal:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to save portal",
        variant: "destructive",
      });
    }
  };

  const handleDeleteClick = (portalId: string) => {
    setPortalToDelete(portalId);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!portalToDelete) return;

    try {
      const { error } = await supabase
        .from("portals")
        .delete()
        .eq("id", portalToDelete);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Portal deleted successfully",
      });

      fetchPortals();
    } catch (error: any) {
      console.error("Error deleting portal:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to delete portal",
        variant: "destructive",
      });
    } finally {
      setDeleteDialogOpen(false);
      setPortalToDelete(null);
    }
  };

  const toggleActive = async (portal: Portal) => {
    try {
      const { error } = await supabase
        .from("portals")
        .update({ is_active: !portal.is_active })
        .eq("id", portal.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: `Portal ${!portal.is_active ? "activated" : "deactivated"}`,
      });

      fetchPortals();
    } catch (error: any) {
      console.error("Error toggling portal status:", error);
      toast({
        title: "Error",
        description: "Failed to update portal status",
        variant: "destructive",
      });
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 2,
    }).format(amount);
  };

  if (loading) {
    return <p className="text-muted-foreground">Loading portals...</p>;
  }

  return (
    <div className="space-y-3 sm:space-y-4">
      <div className="flex justify-end">
        <Button onClick={handleAddClick} className="text-sm h-9">
          <Plus className="mr-2 h-3.5 w-3.5" />
          Add Portal
        </Button>
      </div>

      <div className="rounded-md border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-xs sm:text-sm">Name</TableHead>
              <TableHead className="text-xs sm:text-sm">Commission Rate</TableHead>
              <TableHead className="text-xs sm:text-sm hidden sm:table-cell">Site Fee</TableHead>
              <TableHead className="text-xs sm:text-sm">Status</TableHead>
              <TableHead className="text-xs sm:text-sm hidden lg:table-cell">Created</TableHead>
              <TableHead className="text-xs sm:text-sm text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {portals.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8">
                  <p className="text-sm text-muted-foreground">No portals found</p>
                </TableCell>
              </TableRow>
            ) : (
              portals.map((portal) => (
                <TableRow key={portal.id}>
                  <TableCell className="font-medium text-xs sm:text-sm">{portal.name}</TableCell>
                  <TableCell className="text-xs sm:text-sm">{portal.default_commission_rate}%</TableCell>
                  <TableCell className="text-xs sm:text-sm hidden sm:table-cell">{formatCurrency(portal.default_site_fee)}</TableCell>
                  <TableCell>
                    <Badge variant={portal.is_active ? "default" : "secondary"} className="text-[10px] sm:text-xs">
                      {portal.is_active ? "Active" : "Inactive"}
                    </Badge>
                    <div className="text-[10px] text-muted-foreground sm:hidden mt-0.5">{formatCurrency(portal.default_site_fee)}</div>
                  </TableCell>
                  <TableCell className="text-xs sm:text-sm hidden lg:table-cell">
                    {new Date(portal.created_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => toggleActive(portal)}
                        className="h-7 w-7"
                      >
                        {portal.is_active ? (
                          <ToggleRight className="h-3.5 w-3.5" />
                        ) : (
                          <ToggleLeft className="h-3.5 w-3.5" />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEditClick(portal)}
                        className="h-7 w-7"
                      >
                        <Edit className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteClick(portal.id)}
                        className="text-destructive hover:text-destructive h-7 w-7"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Edit/Add Dialog */}
      <Dialog open={editDialogOpen || addDialogOpen} onOpenChange={(open) => {
        setEditDialogOpen(open);
        setAddDialogOpen(open);
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingPortal ? "Edit Portal" : "Add Portal"}</DialogTitle>
            <DialogDescription>
              {editingPortal ? "Update portal details" : "Create a new portal"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Portal name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="commission">Commission Rate (%)</Label>
              <Input
                id="commission"
                type="number"
                step="0.01"
                value={formData.default_commission_rate}
                onChange={(e) => setFormData({ ...formData, default_commission_rate: e.target.value })}
                placeholder="2.5"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="site_fee">Site Fee (₹)</Label>
              <Input
                id="site_fee"
                type="number"
                step="0.01"
                value={formData.default_site_fee}
                onChange={(e) => setFormData({ ...formData, default_site_fee: e.target.value })}
                placeholder="50.00"
              />
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                id="is_active"
                checked={formData.is_active}
                onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
              />
              <Label htmlFor="is_active">Active</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setEditDialogOpen(false);
              setAddDialogOpen(false);
            }}>
              Cancel
            </Button>
            <Button onClick={handleSave}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Portal</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this portal? This will also delete all associated transactions. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
