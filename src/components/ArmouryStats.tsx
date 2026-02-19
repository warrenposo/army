import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    PieChart,
    Pie,
    Cell,
    ResponsiveContainer,
} from "recharts";
import {
    ShieldCheck,
    ShieldOff,
    RotateCcw,
    AlertTriangle,
    Users,
    UserCog,
    Wrench,
    Activity,
    Clock,
} from "lucide-react";
import { toast } from "sonner";

// ─── Types ────────────────────────────────────────────────────────────────────

interface SummaryStats {
    totalIssued: number;
    armsInStore: number;
    returnsToday: number;
    overdueArms: number;
}

interface DailyData {
    day: string;
    issued: number;
    returned: number;
}

interface WeaponTypeData {
    weapon_type: string;
    count: number;
}

interface HeatmapCell {
    day_of_week: number;
    hour_of_day: number;
    count: number;
}

interface TopUser {
    army_no: string;
    rank: string;
    name: string;
    total_transactions: number;
    returns: number;
    currently_issued: number;
}

interface StoremanActivity {
    storeman: string;
    transactions_handled: number;
}

interface MaintenanceItem {
    butt_no: string;
    type_of_weapon: string;
    issue_count: number;
}

interface RecentRecord {
    id: string;
    army_no: string;
    rank: string;
    name: string;
    type_of_weapon: string;
    butt_no: string;
    date_out: string;
    date_in: string | null;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const PIE_COLORS = [
    "#4ade80", "#facc15", "#60a5fa", "#f87171",
    "#a78bfa", "#fb923c", "#34d399", "#e879f9",
];

const DAYS_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const OVERDUE_HOURS = 24;

// ─── Helper ───────────────────────────────────────────────────────────────────

function formatDay(iso: string) {
    const d = new Date(iso);
    return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
}

function hoursAgo(isoDate: string) {
    return (Date.now() - new Date(isoDate).getTime()) / 3_600_000;
}

// ─── Summary Card ─────────────────────────────────────────────────────────────

interface CardProps {
    title: string;
    value: number | string;
    icon: React.ReactNode;
    accent?: "green" | "blue" | "amber" | "red";
    sub?: string;
}

const SummaryCard = ({ title, value, icon, accent = "blue", sub }: CardProps) => {
    const accentMap = {
        green: "from-green-500/20 to-green-600/10 border-green-500/30 text-green-400",
        blue: "from-blue-500/20  to-blue-600/10  border-blue-500/30  text-blue-400",
        amber: "from-amber-500/20 to-amber-600/10 border-amber-500/30 text-amber-400",
        red: "from-red-500/20   to-red-600/10   border-red-500/30   text-red-400",
    };
    return (
        <div
            className={`relative rounded-xl border bg-gradient-to-br p-5 shadow-sm ${accentMap[accent]}`}
        >
            <div className="flex items-start justify-between">
                <div>
                    <p className="text-xs font-semibold uppercase tracking-wider opacity-70 text-foreground">
                        {title}
                    </p>
                    <p className="mt-2 text-4xl font-extrabold text-foreground">{value}</p>
                    {sub && <p className="mt-1 text-xs text-muted-foreground">{sub}</p>}
                </div>
                <div className="p-2 rounded-lg bg-white/5">{icon}</div>
            </div>
        </div>
    );
};

// ─── Section Heading ──────────────────────────────────────────────────────────

const SectionHeading = ({ icon, title }: { icon: React.ReactNode; title: string }) => (
    <div className="flex items-center gap-2 mb-4">
        <span className="text-primary">{icon}</span>
        <h2 className="text-sm font-bold uppercase tracking-widest text-foreground">{title}</h2>
        <div className="flex-1 h-px bg-border/60" />
    </div>
);

// ─── Main Component ───────────────────────────────────────────────────────────

const ArmouryStats = () => {
    const [summary, setSummary] = useState<SummaryStats>({
        totalIssued: 0,
        armsInStore: 0,
        returnsToday: 0,
        overdueArms: 0,
    });
    const [dailyData, setDailyData] = useState<DailyData[]>([]);
    const [weaponTypes, setWeaponTypes] = useState<WeaponTypeData[]>([]);
    const [heatmap, setHeatmap] = useState<HeatmapCell[]>([]);
    const [topUsers, setTopUsers] = useState<TopUser[]>([]);
    const [storemen, setStoremen] = useState<StoremanActivity[]>([]);
    const [maintenance, setMaintenance] = useState<MaintenanceItem[]>([]);
    const [recentRecords, setRecentRecords] = useState<RecentRecord[]>([]);
    const [totalInventory, setTotalInventory] = useState(0);
    const [loading, setLoading] = useState(true);

    const fetchAll = useCallback(async () => {
        try {
            setLoading(true);

            // ── 1. Summary stats from arms_records directly ──────────────────────
            const { data: allRecords, error: allErr } = await supabase
                .from("arms_records")
                .select("id, date_out, date_in");
            if (allErr) throw allErr;

            const now = new Date();
            const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
            const overdueTs = new Date(now.getTime() - OVERDUE_HOURS * 3_600_000).toISOString();

            const totalIssued = (allRecords || []).filter(r => !r.date_in).length;
            const totalRecords = (allRecords || []).length;
            const returnsToday = (allRecords || []).filter(
                r => r.date_in && r.date_in >= todayStart,
            ).length;
            const overdueArms = (allRecords || []).filter(
                r => !r.date_in && r.date_out && r.date_out < overdueTs,
            ).length;
            const uniqueButts = new Set((allRecords || []).map(r => (r as any).butt_no)).size;
            const armsInStore = Math.max(0, uniqueButts - totalIssued);

            setTotalInventory(Math.max(totalRecords, uniqueButts));
            setSummary({ totalIssued, armsInStore, returnsToday, overdueArms });

            // ── 2. Daily issue/return (last 7 days) ──────────────────────────────
            const { data: dailyRaw, error: dailyErr } = await supabase
                .from("v_daily_issue_summary")
                .select("*")
                .order("day", { ascending: true });
            if (dailyErr) throw dailyErr;

            const last7 = (dailyRaw || []).slice(-7).map(r => ({
                day: formatDay(r.day),
                issued: Number(r.issued),
                returned: Number(r.returned),
            }));
            setDailyData(last7);

            // ── 3. Weapon type distribution ───────────────────────────────────────
            const { data: weaponRaw, error: weapErr } = await supabase
                .from("v_weapon_type_distribution")
                .select("*");
            if (weapErr) throw weapErr;
            setWeaponTypes(
                (weaponRaw || []).map(r => ({
                    weapon_type: r.weapon_type,
                    count: Number(r.count),
                })),
            );

            // ── 4. Heatmap ────────────────────────────────────────────────────────
            const { data: heatRaw, error: heatErr } = await supabase
                .from("v_activity_heatmap")
                .select("*");
            if (heatErr) throw heatErr;
            setHeatmap(
                (heatRaw || []).map(r => ({
                    day_of_week: Number(r.day_of_week),
                    hour_of_day: Number(r.hour_of_day),
                    count: Number(r.count),
                })),
            );

            // ── 5. Top users ──────────────────────────────────────────────────────
            const { data: usersRaw, error: usersErr } = await supabase
                .from("v_top_users")
                .select("*")
                .limit(5);
            if (usersErr) throw usersErr;
            setTopUsers(
                (usersRaw || []).map(r => ({
                    army_no: r.army_no,
                    rank: r.rank,
                    name: r.name,
                    total_transactions: Number(r.total_transactions),
                    returns: Number(r.returns),
                    currently_issued: Number(r.currently_issued),
                })),
            );

            // ── 6. Storeman activity ──────────────────────────────────────────────
            const { data: storeRaw, error: storeErr } = await supabase
                .from("v_storeman_activity")
                .select("*")
                .limit(5);
            if (storeErr) throw storeErr;
            setStoremen(
                (storeRaw || []).map(r => ({
                    storeman: r.storeman,
                    transactions_handled: Number(r.transactions_handled),
                })),
            );

            // ── 7. Maintenance due (butt_nos with ≥ 10 issues) ───────────────────
            const { data: maintRaw, error: maintErr } = await supabase
                .from("arms_records")
                .select("butt_no, type_of_weapon");
            if (maintErr) throw maintErr;

            const buttCounts: Record<string, { count: number; weapon: string }> = {};
            for (const r of maintRaw || []) {
                const key = r.butt_no || "Unknown";
                buttCounts[key] = {
                    count: (buttCounts[key]?.count ?? 0) + 1,
                    weapon: r.type_of_weapon || "Unknown",
                };
            }
            const maintList: MaintenanceItem[] = Object.entries(buttCounts)
                .filter(([, v]) => v.count >= 10)
                .map(([butt_no, v]) => ({
                    butt_no,
                    type_of_weapon: v.weapon,
                    issue_count: v.count,
                }))
                .sort((a, b) => b.issue_count - a.issue_count)
                .slice(0, 5);
            setMaintenance(maintList);

            // ── 8. Recent records ─────────────────────────────────────────────────
            const { data: recentRaw, error: recentErr } = await supabase
                .from("arms_records")
                .select("id, army_no, rank, name, type_of_weapon, butt_no, date_out, date_in")
                .order("date_out", { ascending: false })
                .limit(5);
            if (recentErr) throw recentErr;
            setRecentRecords(recentRaw || []);
        } catch (e: any) {
            toast.error("Stats error: " + e.message);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchAll();

        // Real-time refresh when arms_records changes
        const channel = supabase
            .channel("stats-realtime")
            .on("postgres_changes", { event: "*", schema: "public", table: "arms_records" }, fetchAll)
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, [fetchAll]);

    // ── Heatmap helpers ─────────────────────────────────────────────────────────
    const heatmapMap: Record<string, number> = {};
    let maxHeat = 1;
    for (const cell of heatmap) {
        const key = `${cell.day_of_week}-${cell.hour_of_day}`;
        heatmapMap[key] = cell.count;
        if (cell.count > maxHeat) maxHeat = cell.count;
    }

    const usagePercent = totalInventory > 0
        ? Math.round((summary.totalIssued / totalInventory) * 100)
        : 0;

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center h-64 gap-4 text-muted-foreground">
                <Activity className="w-8 h-8 animate-pulse text-primary" />
                <p className="text-sm">Loading statistics…</p>
            </div>
        );
    }

    return (
        <div className="space-y-10 pb-10">
            {/* ── Summary Cards ─────────────────────────────────────── */}
            <section>
                <SectionHeading icon={<ShieldCheck className="w-4 h-4" />} title="Live Summary" />
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <SummaryCard
                        title="Total Arms Issued"
                        value={summary.totalIssued}
                        icon={<ShieldOff className="w-5 h-5" />}
                        accent="amber"
                        sub="Currently out of store"
                    />
                    <SummaryCard
                        title="Arms in Store"
                        value={summary.armsInStore}
                        icon={<ShieldCheck className="w-5 h-5" />}
                        accent="green"
                        sub="Available for issue"
                    />
                    <SummaryCard
                        title="Returns Today"
                        value={summary.returnsToday}
                        icon={<RotateCcw className="w-5 h-5" />}
                        accent="blue"
                        sub="Last 24 hours"
                    />
                    <SummaryCard
                        title="Overdue Arms"
                        value={summary.overdueArms}
                        icon={<AlertTriangle className="w-5 h-5" />}
                        accent={summary.overdueArms > 0 ? "red" : "green"}
                        sub={`Out > ${OVERDUE_HOURS}h`}
                    />
                </div>
            </section>

            {/* ── Charts ────────────────────────────────────────────── */}
            <section>
                <SectionHeading icon={<Activity className="w-4 h-4" />} title="Visual Charts" />
                <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                    {/* Bar chart — 3 / 5 width */}
                    <div className="lg:col-span-3 rounded-xl border border-border bg-card p-5 shadow-sm">
                        <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-4">
                            Arms Issued vs Returned — Last 7 Days
                        </h3>
                        {dailyData.length === 0 ? (
                            <div className="flex items-center justify-center h-40 text-muted-foreground text-sm">
                                No data for the last 7 days
                            </div>
                        ) : (
                            <ResponsiveContainer width="100%" height={200}>
                                <BarChart data={dailyData} barCategoryGap="30%">
                                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                                    <XAxis
                                        dataKey="day"
                                        tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                                        axisLine={false}
                                        tickLine={false}
                                    />
                                    <YAxis
                                        tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                                        axisLine={false}
                                        tickLine={false}
                                        allowDecimals={false}
                                        width={24}
                                    />
                                    <Tooltip
                                        contentStyle={{
                                            background: "hsl(var(--popover))",
                                            border: "1px solid hsl(var(--border))",
                                            borderRadius: "8px",
                                            fontSize: "12px",
                                        }}
                                    />
                                    <Legend wrapperStyle={{ fontSize: "11px" }} />
                                    <Bar dataKey="issued" name="Issued" fill="#facc15" radius={[4, 4, 0, 0]} />
                                    <Bar dataKey="returned" name="Returned" fill="#4ade80" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        )}
                    </div>

                    {/* Pie chart — 2 / 5 width */}
                    <div className="lg:col-span-2 rounded-xl border border-border bg-card p-5 shadow-sm">
                        <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-4">
                            Weapon Type Distribution (Currently Issued)
                        </h3>
                        {weaponTypes.length === 0 ? (
                            <div className="flex items-center justify-center h-40 text-muted-foreground text-sm">
                                No arms currently issued
                            </div>
                        ) : (
                            <ResponsiveContainer width="100%" height={200}>
                                <PieChart>
                                    <Pie
                                        data={weaponTypes}
                                        dataKey="count"
                                        nameKey="weapon_type"
                                        cx="50%"
                                        cy="50%"
                                        outerRadius={72}
                                        innerRadius={38}
                                        paddingAngle={3}
                                    >
                                        {weaponTypes.map((_, i) => (
                                            <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip
                                        contentStyle={{
                                            background: "hsl(var(--popover))",
                                            border: "1px solid hsl(var(--border))",
                                            borderRadius: "8px",
                                            fontSize: "12px",
                                        }}
                                    />
                                    <Legend
                                        wrapperStyle={{ fontSize: "11px" }}
                                        formatter={(value) => value}
                                    />
                                </PieChart>
                            </ResponsiveContainer>
                        )}
                    </div>
                </div>
            </section>

            {/* ── Activity Heatmap ───────────────────────────────────── */}
            <section>
                <SectionHeading icon={<Clock className="w-4 h-4" />} title="Store Activity Heatmap" />
                <div className="rounded-xl border border-border bg-card p-5 shadow-sm overflow-x-auto">
                    <p className="text-xs text-muted-foreground mb-3">
                        Darker = more activity. Shows all-time arm issue activity by day and hour (UTC+3).
                    </p>
                    <div className="min-w-max">
                        {/* Hour labels */}
                        <div className="flex gap-0.5 mb-1 ml-10">
                            {Array.from({ length: 24 }, (_, h) => (
                                <div key={h} className="w-6 text-center text-[9px] text-muted-foreground">
                                    {h === 0 ? "12am" : h < 12 ? `${h}` : h === 12 ? "12p" : `${h - 12}p`}
                                </div>
                            ))}
                        </div>
                        {/* Rows per day */}
                        {DAYS_SHORT.map((day, di) => (
                            <div key={di} className="flex items-center gap-0.5 mb-0.5">
                                <span className="w-9 text-right text-[10px] text-muted-foreground pr-1">{day}</span>
                                {Array.from({ length: 24 }, (_, h) => {
                                    const count = heatmapMap[`${di}-${h}`] ?? 0;
                                    const intensity = Math.round((count / maxHeat) * 9);
                                    return (
                                        <div
                                            key={h}
                                            title={`${day} ${h}:00 — ${count} issue(s)`}
                                            className="w-6 h-5 rounded-sm transition-colors"
                                            style={{
                                                background: count === 0
                                                    ? "hsl(var(--muted))"
                                                    : `hsla(142, 71%, ${85 - intensity * 5}%, ${0.3 + intensity * 0.07})`,
                                            }}
                                        />
                                    );
                                })}
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ── Personnel Metrics ─────────────────────────────────── */}
            <section>
                <SectionHeading icon={<Users className="w-4 h-4" />} title="Personnel Metrics" />
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Top Users */}
                    <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
                        <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">
                            Top 5 Users
                        </h3>
                        {topUsers.length === 0 ? (
                            <p className="text-sm text-muted-foreground">No data yet.</p>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-xs min-w-[320px]">
                                    <thead>
                                        <tr className="border-b border-border text-muted-foreground">
                                            <th className="text-left pb-2 font-semibold">#</th>
                                            <th className="text-left pb-2 font-semibold">Army No</th>
                                            <th className="text-left pb-2 font-semibold">Name</th>
                                            <th className="text-right pb-2 font-semibold">Txns</th>
                                            <th className="text-right pb-2 font-semibold">Active</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {topUsers.map((u, i) => (
                                            <tr key={u.army_no} className="border-b border-border/40 last:border-0">
                                                <td className="py-2 font-bold text-muted-foreground">{i + 1}</td>
                                                <td className="py-2 font-mono">{u.army_no}</td>
                                                <td className="py-2">
                                                    <span className="text-muted-foreground mr-1">{u.rank}</span>
                                                    {u.name}
                                                </td>
                                                <td className="py-2 text-right font-bold text-primary">
                                                    {u.total_transactions}
                                                </td>
                                                <td className="py-2 text-right">
                                                    {u.currently_issued > 0 ? (
                                                        <span className="text-amber-500 font-semibold">{u.currently_issued}</span>
                                                    ) : (
                                                        <span className="text-green-500">0</span>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>

                    {/* Storeman Activity */}
                    <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
                        <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">
                            <UserCog className="w-3.5 h-3.5 inline mr-1" />
                            Storeman Activity
                        </h3>
                        {storemen.length === 0 ? (
                            <p className="text-sm text-muted-foreground">No storeman data yet.</p>
                        ) : (
                            <div className="space-y-3">
                                {storemen.map((s, i) => {
                                    const maxVal = storemen[0].transactions_handled;
                                    const pct = Math.round((s.transactions_handled / maxVal) * 100);
                                    return (
                                        <div key={i}>
                                            <div className="flex justify-between text-xs mb-1">
                                                <span className="font-medium">{s.storeman}</span>
                                                <span className="text-muted-foreground">{s.transactions_handled} txns</span>
                                            </div>
                                            <div className="h-2 bg-muted rounded-full overflow-hidden">
                                                <div
                                                    className="h-full bg-primary rounded-full transition-all"
                                                    style={{ width: `${pct}%` }}
                                                />
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>
            </section>

            {/* ── Alerts & Monitoring ───────────────────────────────── */}
            <section>
                <SectionHeading icon={<Wrench className="w-4 h-4" />} title="Alerts & Monitoring" />
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Inventory usage */}
                    <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
                        <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-4">
                            Inventory Usage
                        </h3>
                        <div className="flex justify-between text-xs mb-2">
                            <span className="text-muted-foreground">
                                {summary.totalIssued} issued of {totalInventory} total
                            </span>
                            <span className={`font-bold ${usagePercent >= 80 ? "text-red-400" : "text-primary"}`}>
                                {usagePercent}%
                            </span>
                        </div>
                        <div className="h-4 bg-muted rounded-full overflow-hidden">
                            <div
                                className={`h-full rounded-full transition-all ${usagePercent >= 80 ? "bg-red-500" : usagePercent >= 50 ? "bg-amber-500" : "bg-green-500"
                                    }`}
                                style={{ width: `${usagePercent}%` }}
                            />
                        </div>
                        <p className="text-xs text-muted-foreground mt-2">
                            {usagePercent >= 80
                                ? "⚠️  High utilisation — consider restocking."
                                : usagePercent >= 50
                                    ? "Moderate utilisation."
                                    : "Low utilisation — most arms in store."}
                        </p>

                        {/* Overdue list */}
                        {summary.overdueArms > 0 && (
                            <div className="mt-4 p-3 rounded-lg bg-red-500/10 border border-red-500/30">
                                <p className="text-xs font-bold text-red-400 flex items-center gap-1 mb-1">
                                    <AlertTriangle className="w-3.5 h-3.5" />
                                    {summary.overdueArms} overdue arm(s) — out &gt; {OVERDUE_HOURS}h
                                </p>
                                <p className="text-[11px] text-muted-foreground">
                                    Check the Arms Register and initiate return procedures.
                                </p>
                            </div>
                        )}
                    </div>

                    {/* Maintenance due */}
                    <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
                        <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">
                            Maintenance Due (≥10 issues)
                        </h3>
                        {maintenance.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-24 text-muted-foreground gap-2">
                                <ShieldCheck className="w-6 h-6 text-green-500" />
                                <p className="text-sm">All weapons within normal usage limits.</p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-xs min-w-[280px]">
                                    <thead>
                                        <tr className="border-b border-border text-muted-foreground">
                                            <th className="text-left pb-2 font-semibold">Butt No</th>
                                            <th className="text-left pb-2 font-semibold">Type</th>
                                            <th className="text-right pb-2 font-semibold">Issues</th>
                                            <th className="text-right pb-2 font-semibold">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {maintenance.map((m, i) => (
                                            <tr key={i} className="border-b border-border/40 last:border-0">
                                                <td className="py-2 font-mono font-bold">{m.butt_no}</td>
                                                <td className="py-2">{m.type_of_weapon}</td>
                                                <td className="py-2 text-right font-bold text-amber-400">{m.issue_count}</td>
                                                <td className="py-2 text-right">
                                                    <span className="bg-amber-500/20 text-amber-400 text-[10px] font-semibold px-1.5 py-0.5 rounded-full">
                                                        Inspect
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>
            </section>

            {/* ── Recent Activity ───────────────────────────────────── */}
            <section>
                <SectionHeading icon={<Activity className="w-4 h-4" />} title="Recent Activity" />
                <div className="rounded-xl border border-border bg-card shadow-sm overflow-x-auto">
                    <table className="w-full text-xs min-w-[480px]">
                        <thead>
                            <tr className="bg-muted/50 border-b border-border">
                                <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Army No</th>
                                <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Rank / Name</th>
                                <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Weapon / Butt</th>
                                <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Date Out</th>
                                <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {recentRecords.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="text-center py-10 text-muted-foreground">
                                        No records found.
                                    </td>
                                </tr>
                            ) : (
                                recentRecords.map((r, i) => {
                                    const isOverdue =
                                        !r.date_in && r.date_out && hoursAgo(r.date_out) > OVERDUE_HOURS;
                                    return (
                                        <tr
                                            key={r.id}
                                            className={`border-b border-border/40 last:border-0 ${i % 2 === 1 ? "bg-muted/20" : ""
                                                }`}
                                        >
                                            <td className="px-4 py-3 font-mono font-semibold">{r.army_no}</td>
                                            <td className="px-4 py-3">
                                                <span className="text-muted-foreground mr-1">{r.rank}</span>
                                                {r.name}
                                            </td>
                                            <td className="px-4 py-3">
                                                {r.type_of_weapon}{" "}
                                                <span className="text-muted-foreground">#{r.butt_no}</span>
                                            </td>
                                            <td className="px-4 py-3 text-muted-foreground">
                                                {r.date_out
                                                    ? new Date(r.date_out).toLocaleDateString("en-GB", {
                                                        day: "2-digit",
                                                        month: "short",
                                                        year: "2-digit",
                                                    })
                                                    : "—"}
                                            </td>
                                            <td className="px-4 py-3">
                                                {r.date_in ? (
                                                    <span className="bg-green-500/15 text-green-400 text-[10px] font-bold px-2 py-0.5 rounded-full">
                                                        Returned
                                                    </span>
                                                ) : isOverdue ? (
                                                    <span className="bg-red-500/15 text-red-400 text-[10px] font-bold px-2 py-0.5 rounded-full animate-pulse">
                                                        Overdue
                                                    </span>
                                                ) : (
                                                    <span className="bg-amber-500/15 text-amber-400 text-[10px] font-bold px-2 py-0.5 rounded-full">
                                                        Issued
                                                    </span>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </section>
        </div>
    );
};

export default ArmouryStats;
