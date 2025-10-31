'use client';

import { useEffect, useState } from 'react';

interface TimeLeft {
  minutes: number;
  seconds: number;
}

export function CountdownTimer() {
  const [timeLeft, setTimeLeft] = useState<TimeLeft>({ minutes: 15, seconds: 0 });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const updateCountdown = () => {
      const now = Date.now();
      const currentMinute = new Date(now).getMinutes();
      const currentSecond = new Date(now).getSeconds();

      // Calculate minutes until next 15-minute mark (0, 15, 30, 45)
      const nextInterval = Math.ceil((currentMinute + 1) / 15) * 15;
      const minutesLeft = (nextInterval - currentMinute - 1 + 60) % 60;
      const secondsLeft = 60 - currentSecond;

      setTimeLeft({
        minutes: secondsLeft === 60 ? minutesLeft + 1 : minutesLeft,
        seconds: secondsLeft === 60 ? 0 : secondsLeft
      });
      setIsLoading(false);
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);

    return () => clearInterval(interval);
  }, []);

  const progress = ((15 - timeLeft.minutes - timeLeft.seconds / 60) / 15) * 100;

  if (isLoading) {
    return (
      <div className="bg-gradient-to-r from-purple-500/20 to-pink-500/20 backdrop-blur-xl rounded-2xl p-4 border border-white/10">
        <div className="animate-pulse text-center text-white">Loading...</div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-r from-purple-500/20 to-pink-500/20 backdrop-blur-xl rounded-2xl p-6 border border-white/10 shadow-xl">
      <div className="text-center">
        <div className="text-purple-200 text-sm font-medium mb-3">Next Market Update In</div>
        <div className="flex items-center justify-center gap-3 mb-4">
          <div className="bg-black/40 rounded-xl px-6 py-3 min-w-[80px]">
            <div className="text-4xl font-bold text-white tabular-nums">
              {String(timeLeft.minutes).padStart(2, '0')}
            </div>
            <div className="text-xs text-purple-300 mt-1">MIN</div>
          </div>
          <div className="text-3xl font-bold text-white">:</div>
          <div className="bg-black/40 rounded-xl px-6 py-3 min-w-[80px]">
            <div className="text-4xl font-bold text-white tabular-nums">
              {String(timeLeft.seconds).padStart(2, '0')}
            </div>
            <div className="text-xs text-purple-300 mt-1">SEC</div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-black/40 rounded-full h-2 overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all duration-1000 ease-linear"
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="text-xs text-purple-300 mt-2">
          {timeLeft.minutes < 1 && timeLeft.seconds <= 30 && (
            <span className="animate-pulse text-yellow-400 font-semibold">⚡ Markets updating soon!</span>
          )}
        </div>
      </div>
    </div>
  );
}
