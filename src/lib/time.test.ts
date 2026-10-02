import { describe, expect, it } from "vitest";
import { combine, defaultStart, fmtCountdown, fmtDuration, roundUpToQuarter, timeOptions } from "./time";

describe("time", () => {
  it("arrondit au quart d'heure supérieur", () => {
    expect(roundUpToQuarter(new Date(2030, 0, 1, 9, 1))).toEqual(new Date(2030, 0, 1, 9, 15));
    expect(roundUpToQuarter(new Date(2030, 0, 1, 9, 30))).toEqual(new Date(2030, 0, 1, 9, 30));
  });

  it("propose le prochain créneau du jour, ou demain matin en soirée", () => {
    expect(defaultStart(new Date(2030, 0, 7, 10, 5), 7, 20)).toEqual({ day: "2030-01-07", time: "10:15" });
    expect(defaultStart(new Date(2030, 0, 7, 6, 0), 7, 20)).toEqual({ day: "2030-01-07", time: "07:00" });
    expect(defaultStart(new Date(2030, 0, 7, 19, 30), 7, 20)).toEqual({ day: "2030-01-08", time: "09:00" });
  });

  it("formate les durées en français", () => {
    expect(fmtDuration(30)).toBe("30 min");
    expect(fmtDuration(60)).toBe("1 h");
    expect(fmtDuration(90)).toBe("1 h 30");
    expect(fmtDuration(2 * 24 * 60)).toBe("2 jours");
  });

  it("calcule un compte à rebours", () => {
    const now = new Date(2030, 0, 7, 10, 0);
    expect(fmtCountdown(new Date(2030, 0, 7, 10, 20), new Date(2030, 0, 7, 11, 0), now)).toBe("Dans 20 min");
    expect(fmtCountdown(new Date(2030, 0, 7, 9, 30), new Date(2030, 0, 7, 11, 0), now)).toBe("En cours");
    expect(fmtCountdown(new Date(2030, 0, 9, 9, 30), new Date(2030, 0, 9, 11, 0), now)).toBeNull();
  });

  it("combine jour et heure", () => {
    expect(combine("2030-03-04", "15:45")).toEqual(new Date(2030, 2, 4, 15, 45));
    expect(timeOptions(8, 9)).toEqual(["08:00", "08:15", "08:30", "08:45", "09:00"]);
  });
});
