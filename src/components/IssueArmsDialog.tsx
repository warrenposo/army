import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface IssueArmsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (record: {
    armyNo: string;
    rank: string;
    name: string;
    typeOfWeapon: string;
    magazine: string;
    bayonetComplete: string;
    buttNo: string;
    registerNo: string;
    dateOut: string;
    dateIn: string;
    signatureStoreman: string;
    remarks: string;
  }) => void;
}

const IssueArmsDialog = ({ open, onOpenChange, onSubmit }: IssueArmsDialogProps) => {
  const [form, setForm] = useState({
    armyNo: "",
    rank: "",
    name: "",
    typeOfWeapon: "",
    magazine: "",
    bayonetComplete: "",
    buttNo: "",
    registerNo: "",
    dateOut: new Date().toLocaleDateString("en-GB"),
    dateIn: "",
    signatureStoreman: "",
    remarks: "",
  });

  const handleChange = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(form);
    setForm({
      armyNo: "",
      rank: "",
      name: "",
      typeOfWeapon: "",
      magazine: "",
      bayonetComplete: "",
      buttNo: "",
      registerNo: "",
      dateOut: new Date().toLocaleDateString("en-GB"),
      dateIn: "",
      signatureStoreman: "",
      remarks: "",
    });
    onOpenChange(false);
  };

  const fields = [
    { key: "armyNo", label: "Army No", required: true },
    { key: "rank", label: "Rank", required: true },
    { key: "name", label: "Name", required: true },
    { key: "typeOfWeapon", label: "Type of Weapon", required: true },
    { key: "magazine", label: "Magazine" },
    { key: "bayonetComplete", label: "Bayonet Complete" },
    { key: "buttNo", label: "Butt No", required: true },
    { key: "registerNo", label: "Register No", required: true },
    { key: "dateOut", label: "Date Out", required: true },
    { key: "remarks", label: "Remarks" },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-primary">Issue Arms</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            {fields.map((f) => (
              <div key={f.key} className="space-y-1">
                <Label className="text-xs font-medium">{f.label}</Label>
                <Input
                  value={form[f.key as keyof typeof form]}
                  onChange={(e) => handleChange(f.key, e.target.value)}
                  required={f.required}
                  className="h-9 text-sm"
                />
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit">Issue</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default IssueArmsDialog;
