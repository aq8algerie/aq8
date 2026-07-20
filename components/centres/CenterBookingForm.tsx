"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { AlertCircle, Calendar, CheckCircle2, Loader2 } from "lucide-react";
import { collection, doc, onSnapshot, query, where } from "firebase/firestore";
import { db } from "../../src/lib/firebase";
import { Center } from "../../src/types";
import {
  getBookingMinimumDate,
  validatePublicBookingRequest,
} from "../../src/lib/publicFormValidation";
import {
  BookingServiceType,
  getBookingHoursForDate,
  getCapacitySummary,
  getNextOpenBookingDate,
  getSlotCapacity,
  isBookingServiceType,
} from "../../src/lib/bookingCapacityRules";

type CenterBookingFormProps = {
  centerId: string;
  centerName: string;
  centerCity: string;
  services: string[];
  center?: Pick<Center, "id" | "bookingCapacity" | "bookingHours">;
};

type PublicBookingSlot = {
  id?: string;
  centerId?: string;
  dateTime?: string;
  date?: string;
  time?: string;
  capacities?: Partial<Record<BookingServiceType, number>>;
  counts?: Partial<Record<BookingServiceType, number>>;
  remaining?: Partial<Record<BookingServiceType, number>>;
};

type SlotAvailability = {
  capacity: number;
  booked: number;
  remaining: number;
  isFull: boolean;
};

type ReservationResponse = {
  ok?: boolean;
  error?: string;
  reservation?: {
    reservationId: string;
    centerName: string;
    service: string;
    bookingDate: string;
    bookingTime: string;
  };
};

function getServiceLabel(service: string) {
  if (service.toLowerCase() === "aq8") return "AQ8 EMS";
  if (service.toLowerCase() === "wonder") return "Wonder Sculpt";
  return service;
}

function getEndHourLabel(hour: string) {
  const startHour = Number(hour.slice(0, 2));
  if (!Number.isFinite(startHour)) return "";
  return `${String(startHour + 1).padStart(2, "0")}:00`;
}

function getServiceType(value: string): BookingServiceType {
  return isBookingServiceType(value) ? value : "aq8";
}

function resolveSlotAvailability(
  centerId: string,
  serviceType: BookingServiceType,
  center: Pick<Center, "bookingCapacity" | "bookingHours"> | undefined,
  slot?: PublicBookingSlot,
): SlotAvailability {
  const capacity = getSlotCapacity(centerId, serviceType, center);
  const booked = slot?.counts?.[serviceType] ?? 0;
  const safeRemaining = Math.max(capacity - booked, 0);

  return {
    capacity,
    booked,
    remaining: safeRemaining,
    isFull: capacity <= 0 || safeRemaining <= 0,
  };
}

export function CenterBookingForm({
  centerId,
  centerName,
  centerCity,
  services,
  center,
}: CenterBookingFormProps) {
  const [liveCenter, setLiveCenter] = useState<Pick<Center, "id" | "bookingCapacity" | "bookingHours"> | undefined>(center);
  const bookingCenter = liveCenter ?? center;
  const bookingMinimumDate = useMemo(() => getBookingMinimumDate(), []);
  const defaultDate = useMemo(() => getNextOpenBookingDate(centerId, bookingMinimumDate, 45, bookingCenter), [centerId, bookingMinimumDate, bookingCenter]);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [service, setService] = useState(services[0] || "aq8");
  const [bookingDate, setBookingDate] = useState(defaultDate);
  const [bookingTime, setBookingTime] = useState("");
  const [slotByTime, setSlotByTime] = useState<Record<string, PublicBookingSlot>>({});
  const [availabilityLoading, setAvailabilityLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const selectedServiceType = useMemo(() => getServiceType(service), [service]);
  const hours = useMemo(() => getBookingHoursForDate(centerId, bookingDate, bookingCenter), [centerId, bookingDate, bookingCenter]);
  const capacitySummary = useMemo(() => getCapacitySummary(centerId, bookingCenter), [centerId, bookingCenter]);

  const hourAvailability = useMemo(() => {
    const next: Record<string, SlotAvailability> = {};
    for (const hour of hours) {
      next[hour] = resolveSlotAvailability(centerId, selectedServiceType, bookingCenter, slotByTime[hour]);
    }
    return next;
  }, [bookingCenter, centerId, hours, selectedServiceType, slotByTime]);

  const availableHours = useMemo(
    () => hours.filter((hour) => !hourAvailability[hour]?.isFull),
    [hourAvailability, hours],
  );

  const selectedAvailability = bookingTime ? hourAvailability[bookingTime] : undefined;
  const selectedSlotIsFull = Boolean(selectedAvailability?.isFull);
  const canSubmit = !isLoading && !availabilityLoading && Boolean(bookingTime) && hours.length > 0 && !selectedSlotIsFull;

  useEffect(() => {
    if (!services.includes(service)) {
      setService(services[0] || "aq8");
    }
  }, [service, services]);

  useEffect(() => {
    setLiveCenter(center);
  }, [center]);

  useEffect(() => {
    const centerRef = doc(db, "centers", centerId);
    return onSnapshot(
      centerRef,
      (snapshot) => {
        if (snapshot.exists()) {
          setLiveCenter({ id: snapshot.id, ...(snapshot.data() as Omit<Center, "id">) });
        }
      },
      (error) => {
        console.error("Public center booking settings error:", error);
      },
    );
  }, [centerId]);

  useEffect(() => {
    if (!bookingDate || getBookingHoursForDate(centerId, bookingDate, bookingCenter).length === 0) {
      setBookingDate(defaultDate);
    }
  }, [bookingCenter, bookingDate, centerId, defaultDate]);

  useEffect(() => {
    setSlotByTime({});
    if (!bookingDate) {
      setAvailabilityLoading(false);
      return;
    }

    setAvailabilityLoading(true);
    const slotsRef = collection(db, "public_booking_slots", centerId, "slots");
    const slotsQuery = query(slotsRef, where("date", "==", bookingDate));

    return onSnapshot(
      slotsQuery,
      (snapshot) => {
        const next: Record<string, PublicBookingSlot> = {};
        snapshot.forEach((document) => {
          const data = document.data() as PublicBookingSlot;
          if (data.time) {
            next[data.time] = { id: document.id, ...data };
          }
        });
        setSlotByTime(next);
        setAvailabilityLoading(false);
      },
      (error) => {
        console.error("Public slot availability error:", error);
        setSlotByTime({});
        setAvailabilityLoading(false);
      },
    );
  }, [bookingDate, centerId]);

  useEffect(() => {
    if (hours.length === 0) {
      if (bookingTime !== "") setBookingTime("");
      return;
    }

    if (!hours.includes(bookingTime)) {
      setBookingTime(availableHours[0] || hours[0]);
      return;
    }

    if (!availabilityLoading && selectedAvailability?.isFull && availableHours.length > 0) {
      setBookingTime(availableHours[0]);
    }
  }, [availabilityLoading, availableHours, bookingTime, hours, selectedAvailability]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");

    const validation = validatePublicBookingRequest(
      {
        centerId,
        centerName,
        firstName,
        lastName,
        phone,
        email,
        service,
        bookingDate,
        bookingTime,
      },
      services,
      new Date(),
      bookingCenter,
    );

    if (validation.valid === false) {
      setErrorMsg(validation.error);
      return;
    }

    if (selectedAvailability?.isFull) {
      setErrorMsg("Ce créneau vient d'être complet. Veuillez choisir une autre heure.");
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch("/api/public-reservations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validation.data),
      });
      const payload = (await response.json().catch(() => null)) as ReservationResponse | null;

      if (!response.ok || payload?.ok !== true) {
        throw new Error(payload?.error || "Réservation impossible pour ce créneau.");
      }

      setSuccessMsg(
        `Votre créneau est pré-réservé pour le centre ${centerName}. L'équipe du centre vous contactera pour confirmer définitivement le rendez-vous.`,
      );

      setFirstName("");
      setLastName("");
      setPhone("");
      setEmail("");
      setService(services[0] || "aq8");
      const nextDate = getNextOpenBookingDate(centerId, getBookingMinimumDate(), 45, bookingCenter);
      setBookingDate(nextDate);
      setBookingTime(getBookingHoursForDate(centerId, nextDate, bookingCenter)[0] || "");
    } catch (err) {
      console.error("Booking submission error:", err);
      setErrorMsg(err instanceof Error ? err.message : "Une erreur est survenue. Veuillez réessayer ou contacter directement le centre.");
    } finally {
      setIsLoading(false);
    }
  };

  if (successMsg) {
    return (
      <div className="rounded-lg border border-emerald-100 bg-emerald-50 p-6">
        <div className="space-y-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-md bg-emerald-100 text-emerald-700">
            <CheckCircle2 className="h-6 w-6" />
          </div>
          <div className="space-y-2">
            <h2 className="font-display text-xl font-bold text-emerald-900">
              Créneau pré-réservé
            </h2>
            <p className="text-sm font-medium leading-relaxed text-emerald-800">
              {successMsg}
            </p>
            <div className="mt-4 rounded-md border border-amber-200 bg-amber-50 p-4 text-xs font-bold text-amber-800 space-y-1.5">
              <p className="font-medium leading-relaxed text-amber-800">
                La confirmation finale reste faite par l'équipe du centre après vérification du planning et du paiement.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setSuccessMsg("")}
            className="w-full rounded-md bg-[#353535] px-5 py-3 text-sm font-bold text-white transition-all hover:bg-[#ff5757] cursor-pointer"
          >
            Faire une autre réservation
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-slate-200/80 bg-white p-6 shadow-[0_24px_60px_rgba(255,87,87,0.06)] relative overflow-hidden ring-1 ring-slate-100/50">
      <div className="absolute top-0 left-0 w-full h-[4px] bg-gradient-to-r from-[#ff5757] to-amber-400" />
      <div className="mb-5 space-y-2">
        <span className="text-xs font-bold uppercase text-[#ff5757]">
          Réservation en ligne
        </span>
        <h2 className="font-display text-xl font-bold text-[#353535]">
          Dans votre centre de {centerCity}
        </h2>
        <p className="text-sm font-medium leading-relaxed text-slate-500">
          Choisissez une prestation, une date et une heure disponible. Le créneau est bloqué en attente de confirmation par le centre.
        </p>
      </div>

      <div className="mb-5 rounded-md border border-slate-100 bg-slate-50 p-4 text-sm">
        <div className="flex items-center justify-between gap-3">
          <span className="font-bold text-slate-700">Capacité par heure</span>
          <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-[#ff5757]">
            {capacitySummary}
          </span>
        </div>
        <p className="mt-2 text-xs font-medium leading-relaxed text-slate-500">
          Les disponibilités se mettent à jour automatiquement selon les réservations déjà prises et les demandes en attente.
        </p>
      </div>

      {errorMsg && (
        <div className="mb-4 rounded-md border border-rose-100 bg-rose-50 p-3 text-sm font-semibold text-rose-700 flex items-start gap-2">
          <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
          {errorMsg}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4 text-sm font-semibold text-slate-700">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="text-slate-600">Prénom *</label>
            <input
              type="text"
              required
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              placeholder="Amira"
              disabled={isLoading}
              className="w-full rounded-md border border-slate-200 bg-slate-50 px-3 py-2.5 text-slate-900 outline-none transition-all focus:border-[#ff5757] focus:bg-white disabled:opacity-60"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-slate-600">Nom *</label>
            <input
              type="text"
              required
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              placeholder="Cherif"
              disabled={isLoading}
              className="w-full rounded-md border border-slate-200 bg-slate-50 px-3 py-2.5 text-slate-900 outline-none transition-all focus:border-[#ff5757] focus:bg-white disabled:opacity-60"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-slate-600">Téléphone *</label>
          <input
            type="tel"
            required
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="0550 11 22 33"
            disabled={isLoading}
            className="w-full rounded-md border border-slate-200 bg-slate-50 px-3 py-2.5 text-slate-900 outline-none transition-all focus:border-[#ff5757] focus:bg-white disabled:opacity-60"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-slate-600">E-mail facultatif</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="amira@email.com"
            disabled={isLoading}
            className="w-full rounded-md border border-slate-200 bg-slate-50 px-3 py-2.5 text-slate-900 outline-none transition-all focus:border-[#ff5757] focus:bg-white disabled:opacity-60"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-slate-600">Prestation souhaitée</label>
          <select
            value={service}
            onChange={(e) => setService(e.target.value)}
            disabled={isLoading}
            className="w-full rounded-md border border-slate-200 bg-slate-50 px-3 py-2.5 text-slate-900 outline-none transition-all focus:border-[#ff5757] focus:bg-white disabled:opacity-60"
          >
            {services.map((item) => (
              <option key={item} value={item}>
                {getServiceLabel(item)}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="text-slate-600">Date souhaitée</label>
            <input
              type="date"
              min={bookingMinimumDate}
              value={bookingDate}
              onChange={(e) => setBookingDate(e.target.value)}
              disabled={isLoading}
              className="w-full rounded-md border border-slate-200 bg-slate-50 px-3 py-2.5 text-slate-900 outline-none transition-all focus:border-[#ff5757] focus:bg-white disabled:opacity-60"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-slate-600">Heure disponible</label>
            <select
              value={bookingTime}
              onChange={(e) => setBookingTime(e.target.value)}
              disabled={isLoading || availabilityLoading || hours.length === 0}
              className="w-full rounded-md border border-slate-200 bg-slate-50 px-3 py-2.5 text-slate-900 outline-none transition-all focus:border-[#ff5757] focus:bg-white disabled:opacity-60"
            >
              {hours.length === 0 && (
                <option value="">Centre fermé ce jour</option>
              )}
              {hours.map((hour) => {
                const availability = hourAvailability[hour];
                const isFull = availability?.isFull ?? false;
                return (
                  <option key={hour} value={hour} disabled={isFull}>
                    {hour} - {getEndHourLabel(hour)} | {isFull ? "complet" : `${availability.remaining}/${availability.capacity} places`}
                  </option>
                );
              })}
            </select>
          </div>
        </div>

        {hours.length > 0 && (
          <div className="rounded-md border border-slate-100 bg-white p-3 text-xs font-semibold text-slate-600">
            {availabilityLoading ? (
              <span className="inline-flex items-center gap-2 text-slate-500">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Vérification des disponibilités...
              </span>
            ) : selectedAvailability?.isFull ? (
              <span className="text-rose-700">Ce créneau est complet pour {getServiceLabel(service)}.</span>
            ) : selectedAvailability ? (
              <span className="text-emerald-700">
                {selectedAvailability.remaining} place{selectedAvailability.remaining > 1 ? "s" : ""} disponible{selectedAvailability.remaining > 1 ? "s" : ""} pour {getServiceLabel(service)} à {bookingTime}.
              </span>
            ) : null}
          </div>
        )}

        <button
          type="submit"
          disabled={!canSubmit}
          className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-md bg-[#ff5757] px-5 py-3 text-sm font-bold text-white transition-premium hover:bg-[#e94949] hover:shadow-lg hover:shadow-[#ff5757]/15 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Réservation en cours...
            </>
          ) : (
            <>
              <Calendar className="h-4 w-4" />
              Pré-réserver mon créneau
            </>
          )}
        </button>

        <p className="text-xs font-medium leading-relaxed text-slate-500">
          La réservation bloque une place disponible, puis l'équipe du centre confirme définitivement le rendez-vous.
        </p>
      </form>
    </div>
  );
}
