import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Trash2, Edit, Plus } from "lucide-react";
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

interface CardType {
  id: number;
  name: string;
  percentage: number;
  created_at: string;
  updated_at: string;
}

export const AdminCardTypes = () => {
  const [cardTypes, setCardTypes] = useState<CardType[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [cardTypeToDelete, setCardTypeToDelete] = useState<number | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editingCardType, setEditingCardType] = useState<CardType | null>(null);
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    name: "",
    percentage: "",
  });

  useEffect(() => {
    fetchCardTypes();

    const channel = supabase
      .channel("admin-card-types-live")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "card_types",
        },
        () => {
          fetchCardTypes();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchCardTypes = async () => {
    try {
      const { data, error } = await supabase
        .from("card_types")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setCardTypes(data || []);
    } catch (error) {
      console.error("Error fetching card types:", error);
      toast({
        title: "Error",
        description: "Failed to fetch card types",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEditClick = (cardType: CardType) => {
    setEditingCardType(cardType);
    setFormData({
      name: cardType.name,
      percentage: cardType.percentage.toString(),
    });
    setEditDialogOpen(true);
  };

  const handleAddClick = () => {
    setEditingCardType(null);
    setFormData({
      name: "",
      percentage: "",
    });
    setAddDialogOpen(true);
  };

  const validateForm = () => {
    if (!formData.name.trim()) {
      toast({
        title: "Validation Error",
        description: "Card type name is required",
        variant: "destructive",
      });
      return false;
    }

    const percentage = parseFloat(formData.percentage);
    if (isNaN(percentage) || percentage < 0 || percentage > 100) {
      toast({
        title: "Validation Error",
        description: "Percentage must be between 0 and 100",
        variant: "destructive",
      });
      return false;
    }

    return true;
  };

  const handleSave = async () => {
    if (!validateForm()) return;

    try {
      const data = {
        name: formData.name.trim(),
        percentage: parseFloat(formData.percentage),
      };

      if (editingCardType) {
        const { error } = await supabase
          .from("card_types")
          .update(data)
          .eq("id", editingCardType.id);

        if (error) throw error;

        toast({
          title: "Success",
          description: "Card type updated successfully",
        });
        setEditDialogOpen(false);
      } else {
        const { error } = await supabase
          .from("card_types")
          .insert(data);

        if (error) throw error;

        toast({
          title: "Success",
          description: "Card type created successfully",
        });
        setAddDialogOpen(false);
      }

      fetchCardTypes();
    } catch (error: any) {
      console.error("Error saving card type:", error);
      
      // Handle unique constraint violation
      if (error.code === '23505') {
        toast({
          title: "Error",
          description: "A card type with this name already exists",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Error",
          description: error.message || "Failed to save card type",
          variant: "destructive",
        });
      }
    }
  };

  const handleDeleteClick = (cardTypeId: number) => {
    setCardTypeToDelete(cardTypeId);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!cardTypeToDelete) return;

    try {
      const { error } = await supabase
        .from("card_types")
        .delete()
        .eq("id", cardTypeToDelete);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Card type deleted successfully",
      });

      fetchCardTypes();
    } catch (error: any) {
      console.error("Error deleting card type:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to delete card type",
        variant: "destructive",
      });
    } finally {
      setDeleteDialogOpen(false);
      setCardTypeToDelete(null);
    }
  };

  if (loading) {
    return <p className="text-muted-foreground">Loading card types...</p>;
  }

  return (
    <div className="space-y-3 sm:space-y-4">
      <div className="flex justify-end">
        <Button onClick={handleAddClick} className="text-sm h-9">
          <Plus className="mr-2 h-3.5 w-3.5" />
          Add Card Type
        </Button>
      </div>

      <div className="rounded-md border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-xs sm:text-sm">Name</TableHead>
              <TableHead className="text-xs sm:text-sm">Percentage</TableHead>
              <TableHead className="text-xs sm:text-sm hidden lg:table-cell">Created</TableHead>
              <TableHead className="text-xs sm:text-sm hidden lg:table-cell">Updated</TableHead>
              <TableHead className="text-xs sm:text-sm text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {cardTypes.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8">
                  <p className="text-sm text-muted-foreground">No card types found</p>
                </TableCell>
              </TableRow>
            ) : (
              cardTypes.map((cardType) => (
                <TableRow key={cardType.id}>
                  <TableCell className="font-medium text-xs sm:text-sm">{cardType.name}</TableCell>
                  <TableCell className="text-xs sm:text-sm">{cardType.percentage}%</TableCell>
                  <TableCell className="text-xs sm:text-sm hidden lg:table-cell">
                    {new Date(cardType.created_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="text-xs sm:text-sm hidden lg:table-cell">
                    {new Date(cardType.updated_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEditClick(cardType)}
                        className="h-7 w-7"
                      >
                        <Edit className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteClick(cardType.id)}
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
            <DialogTitle>{editingCardType ? "Edit Card Type" : "Add Card Type"}</DialogTitle>
            <DialogDescription>
              {editingCardType ? "Update card type details" : "Create a new card type"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Credit Card, Debit Card"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="percentage">Percentage (%)</Label>
              <Input
                id="percentage"
                type="number"
                step="0.01"
                min="0"
                max="100"
                value={formData.percentage}
                onChange={(e) => setFormData({ ...formData, percentage: e.target.value })}
                placeholder="2.50"
              />
              <p className="text-xs text-muted-foreground">Enter a value between 0 and 100</p>
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
            <AlertDialogTitle>Delete Card Type</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this card type? This action cannot be undone.
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
