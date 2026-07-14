"use client";

import { FormEvent, useMemo, useState } from "react";
import { Calendar, CheckCircle2, Loader2, AlertCircle } from "lucide-react";
import { collection, addDoc } from "firebase/firestore";
import { db } from "../../src/lib/firebase";

type CenterBookingFormProps = {
  centerId: string;
  centerName: string;
  centerCity: string;
  services: string[];
};

function getServiceLabel(service: string) {
  if (service.toLowerCase() === "aq8") return "AQ8 EMS";
  if (service.toLowerCase() === "wonder") return "Wonder Sculpt";
  return service;
}

function getTomorrowDate() {
  const date = new Date();
  const currentHours = date.getHours();
  const currentMinutes = date.getMinutes();
  if (currentHours > 21 || (currentHours === 21 && currentMinutes >= 30)) {
    date.setDate(date.getDate() + 2);
  } else {
    date.setDate(date.getDate() + 1);
  }
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

export function CenterBookingForm({
  centerId,
  centerName,
  centerCity,
  services,
}: CenterBookingFormProps) {
  const defaultDate = useMemo(() => getTomorrowDate(), []);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [service, setService] = useState(services[0] || "aq8");
  const [bookingDate, setBookingDate] = useState(defaultDate);
  const [bookingTime, setBookingTime] = useState("10:00");
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const hours = [
    "09:00", "10:00", "11:00", "12:00", "13:00",
    "14:00", "15:00", "16:00", "17:00", "18:00", "19:00", "20:00",
  ];

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMsg("");

    if (!firstName.trim() || !lastName.trim() || !phone.trim()) {
      setErrorMsg("Veuillez renseigner votre prénom, votre nom et votre téléphone.");
      return;
    }

    setIsLoading(true);

    try {
      await addDoc(collection(db, "booking_requests"), {
        centerId,
        centerName,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        phone: phone.trim(),
        email: email.trim(),
        service,
        bookingDate,
        bookingTime,
        status: "pending",
        createdAt: new Date().toISOString(),
      });

      setSuccessMsg(
        `Votre demande de réservation a bien été enregistrée pour le centre ${centerName}. L'équipe du centre vous contactera pour confirmer le créneau.`
      );

      setFirstName("");
      setLastName("");
      setPhone("");
      setEmail("");
      setService(services[0] || "aq8");
      setBookingDate(getTomorrowDate());
      setBookingTime("10:00");
    } catch (err) {
      console.error("Booking submission error:", err);
      setErrorMsg("Une erreur est survenue lors de l'envoi. Veuillez réessayer ou contacter directement le centre.");
    } finally {
      setIsLoading(false);
    }
  };

  if (successMsg) {
    return (
      <div className="rounded-3xl border border-emerald-100 bg-emerald-50 p-6 shadow-sm">
        <div className="space-y-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">
            <CheckCircle2 className="h-6 w-6" />
          </div>
          <div className="space-y-2">
            <h2 className="font-display text-xl font-bold text-emerald-900">
              Demande envoyée ✓
            </h2>
            <p className="text-sm font-medium leading-relaxed text-emerald-800">
              {successMsg}
            </p>
            <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-xs font-bold text-amber-800 space-y-1.5">
              <p className="flex items-center gap-1.5 text-amber-900">
                <span>⚠️🚨</span> IMPORTANT :
              </p>
              <p className="font-medium text-amber-800 leading-relaxed">
                Vous devez absolument recevoir votre reçu de paiement pour valider votre paiement directement à notre centre.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setSuccessMsg("")}
            className="w-full rounded-xl bg-[#353535] px-5 py-3 text-sm font-bold text-white transition-all hover:bg-[#ff5757] cursor-pointer"
          >
            Faire une autre demande
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
      <div className="mb-5 space-y-2">
        <span className="text-xs font-bold uppercase tracking-wider text-[#ff5757]">
          Demande de réservation
        </span>
        <h2 className="font-display text-xl font-bold text-[#353535]">
          Dans votre centre de {centerCity}
        </h2>
        <p className="text-sm font-medium leading-relaxed text-slate-500">
          Remplissez ce formulaire pour envoyer une demande. Le centre vous
          recontactera pour confirmer le créneau selon les disponibilités.
        </p>
      </div>

      <ul className="mb-5 space-y-2 border-b border-slate-100 pb-5 text-sm font-medium text-slate-600">
        <li className="flex items-start gap-2">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#ff5757]" />
          <span>Demande à envoyer avant la séance souhaitée.</span>
        </li>
        <li className="flex items-start gap-2">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#ff5757]" />
          <span>Créneaux proposés par heure complète.</span>
        </li>
        <li className="flex items-start gap-2">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#ff5757]" />
          <span>Confirmation finale par l'équipe du centre.</span>
        </li>
      </ul>

      {errorMsg && (
        <div className="mb-4 rounded-2xl border border-rose-100 bg-rose-50 p-3 text-sm font-semibold text-rose-700 flex items-start gap-2">
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
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-slate-900 outline-none transition-all focus:border-[#ff5757] focus:bg-white disabled:opacity-60"
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
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-slate-900 outline-none transition-all focus:border-[#ff5757] focus:bg-white disabled:opacity-60"
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
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-slate-900 outline-none transition-all focus:border-[#ff5757] focus:bg-white disabled:opacity-60"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-slate-600">E-mail (facultatif)</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="amira@email.com"
            disabled={isLoading}
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-slate-900 outline-none transition-all focus:border-[#ff5757] focus:bg-white disabled:opacity-60"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-slate-600">Prestation souhaitée</label>
          <select
            value={service}
            onChange={(e) => setService(e.target.value)}
            disabled={isLoading}
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-slate-900 outline-none transition-all focus:border-[#ff5757] focus:bg-white disabled:opacity-60"
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
              min={defaultDate}
              value={bookingDate}
              onChange={(e) => setBookingDate(e.target.value)}
              disabled={isLoading}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-slate-900 outline-none transition-all focus:border-[#ff5757] focus:bg-white disabled:opacity-60"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-slate-600">Heure souhaitée</label>
            <select
              value={bookingTime}
              onChange={(e) => setBookingTime(e.target.value)}
              disabled={isLoading}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-slate-900 outline-none transition-all focus:border-[#ff5757] focus:bg-white disabled:opacity-60"
            >
              {hours.map((hour) => (
                <option key={hour} value={hour}>
                  {hour} — {String(Number(hour.slice(0, 2)) + 1).padStart(2, "0")}:00
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="rounded-2xl border border-amber-100 bg-amber-50/50 p-3.5 space-y-1 text-xs">
          <p className="font-bold text-amber-800 flex items-center gap-1.5">
            <span>ℹ️</span> Note sur l'heure de rendez-vous :
          </p>
          <p className="font-medium text-slate-600 leading-relaxed">
            Il peut y avoir un décalage dû au fuseau horaire, mais l'heure que vous avez sélectionnée est la bonne et reste confirmée.
          </p>
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#ff5757] px-5 py-3 text-sm font-bold text-white shadow-md shadow-[#ff5757]/20 transition-all hover:bg-[#e94949] cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Envoi en cours…
            </>
          ) : (
            <>
              <Calendar className="h-4 w-4" />
              Envoyer ma demande
            </>
          )}
        </button>

        <p className="text-xs font-medium leading-relaxed text-slate-500">
          Cette demande ne confirme pas automatiquement le rendez-vous. Le centre vous contactera pour confirmer le créneau.
        </p>
      </form>
    </div>
  );
}
