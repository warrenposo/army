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

interface ReturnArmsDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSubmit: (signatureStoreman: string) => void;
    recordName: string;
}

const ReturnArmsDialog = ({ open, onOpenChange, onSubmit, recordName }: ReturnArmsDialogProps) => {
    const [signatureStoreman, setSignatureStoreman] = useState("");

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!signatureStoreman.trim()) return;
        onSubmit(signatureStoreman);
        setSignatureStoreman("");
        onOpenChange(false);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle className="text-primary">Return Arms - {recordName}</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="sigStoreman" className="text-sm font-medium">
                            Signature Storeman
                        </Label>
                        <Input
                            id="sigStoreman"
                            placeholder="Enter storeman signature"
                            value={signatureStoreman}
                            onChange={(e) => setSignatureStoreman(e.target.value)}
                            required
                            className="h-10 text-sm"
                        />
                    </div>
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                            Cancel
                        </Button>
                        <Button type="submit">Complete Return</Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
};

export default ReturnArmsDialog;
