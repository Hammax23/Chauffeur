"use client";

import { Timer } from "lucide-react";

function parseStopPeriods(json?: string | null): { start: string; end?: string }[] {
  if (!json?.trim()) return [];
  try {
    const p = JSON.parse(json) as unknown;
    return Array.isArray(p) ? p : [];
  } catch {
    return [];
  }
}

function formatDurationMs(ms: number | null): string {
  if (ms == null || !Number.isFinite(ms) || ms < 0) return "—";
  const sec = Math.floor(ms / 1000);
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  if (h > 0) return `${h}h ${m}m ${s}s`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

export type DriverTripTimingPanelProps = {
  status: string;
  driverOnTheWayAt?: string | null;
  driverStopPeriodsJson?: string | null;
  completedAt?: string | null;
  /** Extra classes on outer wrapper */
  className?: string;
  /** Hide icon + title row (e.g. nested inside another heading) */
  hideHeader?: boolean;
};

export default function DriverTripTimingPanel({
  status,
  driverOnTheWayAt,
  driverStopPeriodsJson,
  completedAt,
  className = "",
  hideHeader = false,
}: DriverTripTimingPanelProps) {
  const periods = parseStopPeriods(driverStopPeriodsJson);
  const startMs = driverOnTheWayAt ? new Date(driverOnTheWayAt).getTime() : null;
  const nowMs = Date.now();
  const endMs = completedAt ? new Date(completedAt).getTime() : nowMs;
  const totalTripMs = startMs != null ? endMs - startMs : null;
  const completedStopMs = periods
    .filter((p) => p.end)
    .reduce((acc, p) => acc + (new Date(p.end!).getTime() - new Date(p.start).getTime()), 0);
  const openStop = periods.find((p) => !p.end);
  const openStopMs =
    openStop && status === "STOP" ? nowMs - new Date(openStop.start).getTime() : null;
  const lastEnded = [...periods].reverse().find((p) => p.end);
  const drivingAfterContinueMs =
    lastEnded?.end && status === "CIC" && !completedAt ? nowMs - new Date(lastEnded.end).getTime() : null;

  const empty = !driverOnTheWayAt && !completedAt && periods.length === 0;

  return (
    <div
      className={`rounded-xl border border-[#C9A063]/35 bg-[#FFFDF9] p-4 space-y-3 ${className}`}
    >
      {!hideHeader && (
        <div className="flex items-center gap-2">
          <Timer className="w-4 h-4 text-[#C9A063]" />
          <h4 className="text-xs font-semibold text-gray-700 uppercase tracking-wider">
            Actual trip time (driver)
          </h4>
        </div>
      )}

      {empty ? (
        <p className="text-sm text-gray-600">
          No timing yet — shown after the driver sets <strong>On The Way</strong> in the driver app.
        </p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2 text-sm">
          <p className="text-gray-700">
            <span className="text-gray-500 block text-xs mb-0.5">Trip started (On The Way)</span>
            {driverOnTheWayAt ? new Date(driverOnTheWayAt).toLocaleString() : "—"}
          </p>
          <p className="text-gray-700">
            <span className="text-gray-500 block text-xs mb-0.5">Trip ended (Done)</span>
            {completedAt ? (
              new Date(completedAt).toLocaleString()
            ) : (
              <span className="text-amber-700 font-medium">In progress</span>
            )}
          </p>
          <p className="text-gray-900 font-semibold sm:col-span-2 pt-1 border-t border-[#C9A063]/20">
            <span className="text-gray-500 font-normal text-xs uppercase tracking-wide mr-2">
              Total trip (On The Way → Done)
            </span>
            {formatDurationMs(totalTripMs)}
            {!completedAt && startMs != null && (
              <span className="text-xs font-normal text-gray-500 ml-2">(so far)</span>
            )}
          </p>
          {completedStopMs > 0 && (
            <p className="text-gray-800 sm:col-span-2">
              <span className="text-gray-500 text-xs uppercase tracking-wide mr-2">
                Sum of stop times (Stop → Continue)
              </span>
              <span className="font-semibold">{formatDurationMs(completedStopMs)}</span>
            </p>
          )}
          {openStopMs != null && (
            <p className="text-red-800 sm:col-span-2">
              <span className="text-xs uppercase tracking-wide mr-2">Current stop (live)</span>
              <span className="font-semibold">{formatDurationMs(openStopMs)}</span>
            </p>
          )}
          {drivingAfterContinueMs != null && drivingAfterContinueMs >= 0 && (
            <p className="text-gray-800 sm:col-span-2">
              <span className="text-gray-500 text-xs uppercase tracking-wide mr-2">
                Driving after last Continue
              </span>
              <span className="font-semibold">{formatDurationMs(drivingAfterContinueMs)}</span>
              <span className="text-xs font-normal text-gray-500 ml-2">(so far)</span>
            </p>
          )}
          {periods.length > 0 && (
            <div className="sm:col-span-2 pt-2 border-t border-gray-200">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                Stop intervals
              </p>
              <ul className="space-y-1.5 text-xs text-gray-700">
                {periods.map((p, i) => {
                  const dur =
                    p.end != null ? new Date(p.end).getTime() - new Date(p.start).getTime() : null;
                  return (
                    <li key={i} className="flex flex-wrap gap-x-2 gap-y-1">
                      <span className="font-medium text-[#C9A063]">#{i + 1}</span>
                      <span>
                        {new Date(p.start).toLocaleString()}
                        {" → "}
                        {p.end ? new Date(p.end).toLocaleString() : <em className="text-red-700">open</em>}
                      </span>
                      {dur != null && <span className="text-gray-600">({formatDurationMs(dur)})</span>}
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
