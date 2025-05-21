
"use client"

import * as React from "react"
import { format, isValid, parseISO } from "date-fns"
import type { DateRange } from "react-day-picker"
import { Calendar as CalendarIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

interface DatePickerWithRangeProps extends React.HTMLAttributes<HTMLDivElement> {
  date: DateRange | undefined
  onDateChange: (date: DateRange | undefined) => void
  disabled?: boolean;
}

export function DatePickerWithRange({
  className,
  date,
  onDateChange,
  disabled,
}: DatePickerWithRangeProps) {
  return (
    <div className={cn("grid gap-2", className)}>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            id="date"
            variant={"outline"}
            disabled={disabled}
            className={cn(
              "w-full sm:w-[280px] justify-start text-left font-normal",
              !date && "text-muted-foreground"
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {date?.from ? (
              date.to ? (
                <>
                  {isValid(date.from) ? format(date.from, "LLL dd, y") : "Invalid Date"} -{" "}
                  {isValid(date.to) ? format(date.to, "LLL dd, y") : "Invalid Date"}
                </>
              ) : (
                isValid(date.from) ? format(date.from, "LLL dd, y") : "Invalid Date"
              )
            ) : (
              <span>Pick a date range</span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            initialFocus
            mode="range"
            defaultMonth={date?.from}
            selected={date}
            onSelect={onDateChange}
            numberOfMonths={2}
          />
        </PopoverContent>
      </Popover>
    </div>
  )
}
