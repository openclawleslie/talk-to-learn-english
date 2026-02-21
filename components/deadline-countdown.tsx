"use client";

import { useEffect, useState } from "react";
import { Clock } from "lucide-react";

type Props = {
  deadline: string; // ISO 8601 datetime string
};

type TimeRemaining = {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  isPast: boolean;
};

function calculateTimeRemaining(deadline: string): TimeRemaining {
  const now = new Date();
  const target = new Date(deadline);
  const diff = target.getTime() - now.getTime();

  if (diff <= 0) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0, isPast: true };
  }

  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  return {
    days,
    hours: hours % 24,
    minutes: minutes % 60,
    seconds: seconds % 60,
    isPast: false,
  };
}

function formatTimeRemaining(time: TimeRemaining): string {
  if (time.isPast) {
    return "已截止";
  }

  const parts: string[] = [];

  if (time.days > 0) {
    parts.push(`${time.days} 天`);
  }
  if (time.hours > 0) {
    parts.push(`${time.hours} 小時`);
  }
  if (time.days === 0 && time.minutes > 0) {
    parts.push(`${time.minutes} 分鐘`);
  }

  return parts.length > 0 ? parts.join(" ") : "不到 1 分鐘";
}

function getUrgencyLevel(time: TimeRemaining): "low" | "medium" | "high" | "past" {
  if (time.isPast) return "past";

  const totalHours = time.days * 24 + time.hours;

  if (totalHours < 24) return "high";
  if (totalHours < 48) return "medium";
  return "low";
}

export function DeadlineCountdown({ deadline }: Props) {
  const [timeRemaining, setTimeRemaining] = useState<TimeRemaining>(() =>
    calculateTimeRemaining(deadline)
  );

  useEffect(() => {
    // Update every second
    const interval = setInterval(() => {
      setTimeRemaining(calculateTimeRemaining(deadline));
    }, 1000);

    return () => clearInterval(interval);
  }, [deadline]);

  const urgency = getUrgencyLevel(timeRemaining);
  const formattedTime = formatTimeRemaining(timeRemaining);

  // Style based on urgency level
  const urgencyStyles = {
    low: "bg-base-200 text-base-content",
    medium: "bg-warning/20 text-warning-content border border-warning/30",
    high: "bg-error/20 text-error-content border border-error/30 animate-pulse",
    past: "bg-base-300 text-base-content/60",
  };

  const iconStyles = {
    low: "text-base-content/60",
    medium: "text-warning",
    high: "text-error",
    past: "text-base-content/40",
  };

  return (
    <div
      className={`flex items-center gap-2 px-3 py-2 rounded-lg ${urgencyStyles[urgency]}`}
      role="timer"
      aria-live="polite"
      aria-label={timeRemaining.isPast ? "Deadline passed" : `Time remaining: ${formattedTime}`}
    >
      <Clock className={`h-4 w-4 ${iconStyles[urgency]}`} />
      <div className="flex flex-col">
        <span className="text-xs opacity-70">
          {timeRemaining.isPast ? "截止時間" : "剩餘時間"}
        </span>
        <span className="text-sm font-medium">{formattedTime}</span>
      </div>
    </div>
  );
}
