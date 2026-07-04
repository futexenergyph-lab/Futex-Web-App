"use client";

import { useState } from "react";
import { DayExport } from "@/components/admin/day-export";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function CustomDayExport({ today }: { today: string }) {
  const [day, setDay] = useState(today);
  return (
    <div className="flex flex-wrap items-end gap-3">
      <div className="space-y-1">
        <Label htmlFor="pickday">Pick a date</Label>
        <Input
          id="pickday"
          type="date"
          value={day}
          max={today}
          onChange={(e) => setDay(e.target.value)}
          className="w-44"
        />
      </div>
      {day && <DayExport day={day} />}
    </div>
  );
}
