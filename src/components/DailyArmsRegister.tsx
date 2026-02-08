import { useState, useEffect } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Plus, Search, Loader2 } from "lucide-react";
import IssueArmsDialog from "./IssueArmsDialog";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

interface ArmsRecord {
  id: string; // Changed to string (UUID)
  serialNo: number;
  armyNo: string;
  rank: string;
  name: string;
  typeOfWeapon: string;
  magazine: string;
  bayonetComplete: string;
  buttNo: string;
  registerNo: string;
  dateOut: string;
  signature: string;
  dateIn: string;
  signatureStoreman: string;
  remarks: string;
}

const DailyArmsRegister = () => {
  const [records, setRecords] = useState<ArmsRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    fetchRecords();

    // Subscribe to realtime changes
    const channel = supabase
      .channel('schema-db-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'arms_records'
        },
        () => {
          fetchRecords();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchRecords = async () => {
    try {
      const { data, error } = await supabase
        .from('arms_records')
        .select('*')
        .order('serial_no', { ascending: false });

      if (error) throw error;

      // Transform snake_case from DB to camelCase for frontend
      const transformedRecords: ArmsRecord[] = (data || []).map(r => ({
        id: r.id,
        serialNo: r.serial_no,
        armyNo: r.army_no,
        rank: r.rank,
        name: r.name,
        typeOfWeapon: r.type_of_weapon,
        magazine: r.magazine,
        bayonetComplete: r.bayonet_complete,
        buttNo: r.butt_no,
        registerNo: r.register_no,
        dateOut: r.date_out ? new Date(r.date_out).toLocaleDateString("en-GB") : "",
        signature: r.signature,
        dateIn: r.date_in ? new Date(r.date_in).toLocaleDateString("en-GB") : "",
        signatureStoreman: r.signature_storeman,
        remarks: r.remarks,
      }));

      setRecords(transformedRecords);
    } catch (error: any) {
      toast.error("Error fetching records: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const filtered = records.filter(
    (r) =>
      r.name.toLowerCase().includes(search.toLowerCase()) ||
      r.armyNo.includes(search) ||
      r.buttNo.includes(search)
  );

  const handleAddRecord = async (record: Omit<ArmsRecord, "id" | "serialNo">) => {
    try {
      const { error } = await supabase
        .from('arms_records')
        .insert([{
          army_no: record.armyNo,
          rank: record.rank,
          name: record.name,
          type_of_weapon: record.typeOfWeapon,
          magazine: record.magazine,
          bayonet_complete: record.bayonetComplete,
          butt_no: record.buttNo,
          register_no: record.registerNo,
          signature: record.signature,
          remarks: record.remarks
        }]);

      if (error) throw error;
      toast.success("Record added successfully");
      fetchRecords(); // Refresh data
    } catch (error: any) {
      toast.error("Error adding record: " + error.message);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <h2 className="text-xl font-bold text-foreground uppercase tracking-wide">
          Daily Arms Issue Register
        </h2>
        <p className="text-sm text-muted-foreground mt-1">Forces Book 7185</p>
      </div>

      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, army no, butt no..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Issue Arms
        </Button>
      </div>

      {/* Table */}
      <div className="rounded-lg border border-border overflow-x-auto bg-card">
        <Table>
          <TableHeader>
            <TableRow className="bg-table-header hover:bg-table-header">
              <TableHead className="text-table-header-foreground font-semibold text-xs">S/No</TableHead>
              <TableHead className="text-table-header-foreground font-semibold text-xs">Army No</TableHead>
              <TableHead className="text-table-header-foreground font-semibold text-xs">Rank</TableHead>
              <TableHead className="text-table-header-foreground font-semibold text-xs">Name</TableHead>
              <TableHead className="text-table-header-foreground font-semibold text-xs">Type of Weapon</TableHead>
              <TableHead className="text-table-header-foreground font-semibold text-xs">Magazine</TableHead>
              <TableHead className="text-table-header-foreground font-semibold text-xs">Bayonet Complete</TableHead>
              <TableHead className="text-table-header-foreground font-semibold text-xs">Butt No</TableHead>
              <TableHead className="text-table-header-foreground font-semibold text-xs">Reg No</TableHead>
              <TableHead className="text-table-header-foreground font-semibold text-xs">Date Out</TableHead>
              <TableHead className="text-table-header-foreground font-semibold text-xs">Signature</TableHead>
              <TableHead className="text-table-header-foreground font-semibold text-xs">Date In</TableHead>
              <TableHead className="text-table-header-foreground font-semibold text-xs">Sig. Storeman</TableHead>
              <TableHead className="text-table-header-foreground font-semibold text-xs">Remarks</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={14} className="text-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" />
                  <p className="mt-2 text-sm text-muted-foreground">Loading records...</p>
                </TableCell>
              </TableRow>
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={14} className="text-center py-8 text-muted-foreground">
                  No records found
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((record, idx) => (
                <TableRow
                  key={record.id}
                  className={idx % 2 === 1 ? "bg-table-row-alt" : ""}
                >
                  <TableCell className="text-xs font-medium">{record.serialNo}</TableCell>
                  <TableCell className="text-xs">{record.armyNo}</TableCell>
                  <TableCell className="text-xs">{record.rank}</TableCell>
                  <TableCell className="text-xs font-medium">{record.name}</TableCell>
                  <TableCell className="text-xs">{record.typeOfWeapon}</TableCell>
                  <TableCell className="text-xs">{record.magazine}</TableCell>
                  <TableCell className="text-xs">{record.bayonetComplete}</TableCell>
                  <TableCell className="text-xs">{record.buttNo}</TableCell>
                  <TableCell className="text-xs">{record.registerNo}</TableCell>
                  <TableCell className="text-xs">{record.dateOut}</TableCell>
                  <TableCell className="text-xs">{record.signature}</TableCell>
                  <TableCell className="text-xs">{record.dateIn || "—"}</TableCell>
                  <TableCell className="text-xs">{record.signatureStoreman}</TableCell>
                  <TableCell className="text-xs">{record.remarks || "—"}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <IssueArmsDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSubmit={handleAddRecord}
      />
    </div>
  );
};

export default DailyArmsRegister;
