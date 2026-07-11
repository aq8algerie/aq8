"use client";

import { FormEvent, useMemo, useState } from "react";
import { CheckCircle2, Send } from "lucide-react";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { requireFirestore } from "../../src/lib/firebase";
import type { Center } from "../../src/types";

type ContactFormProps = {
  centers: Center[];
};

type RequestType = "general" | "reservation" | "partnership" | "recruitment";

const requestTypes: { value: RequestType; label: string }[] = [
  { value: "general", label: "Question générale" },
  { value: "reservation", label: "Demande liée à une réservation" },
  { value: "partnership", label: "Partenariat / franchise" },
  { value: "recruitment", label: "Recrutement" },
];

export function ContactForm({ centers }: ContactFormProps) {
  const defaultCenterId = useMemo(() => centers[0]?.id || "general", [centers]);

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [requestType, setRequestType] = useState<RequestType>("general");
  const [selectedCenter, setSelectedCenter] = useState(defaultCenterId);
  const [message, setMessage] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const resetForm = () => {
    setName("");
    setPhone("");
    setEmail("");
    setRequestType("general");
    setSelectedCenter(defaultCenterId);
    setMessage("");
    setErrorMsg("");
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMsg("");

    if (!name.trim() || !phone.trim()) {
      setErrorMsg("Veuillez renseigner au minimum votre nom et votre téléphone.");
      return;
    }

    const contactRequest = {
      name: name.trim(),
      phone: phone.trim(),
      email: email.trim(),
      requestType,
      selectedCenter,
      message: message.trim(),
      status: "new",
      createdAt: serverTimestamp(),
    };

    try {
      await addDoc(collection(requireFirestore(), 'contact_requests'), contactRequest);
    } catch (error) {
      console.error(error);
      setErrorMsg("Impossible d’envoyer le message pour le moment. Veuillez réessayer ou contacter AQ8 directement.");
      return;
    }

    setSubmitted(true);
    resetForm();
  };

  if (submitted) {
    return (
      <div className="rounded-3xl border border-emerald-100 bg-emerald-50 p-8 text-center shadow-sm">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">
          <CheckCircle2 className="h-7 w-7" />
        </div>

        <div className="mx-auto mt-5 max-w-md space-y-3">
          <h2 className="font-display text-2xl font-bold text-emerald-900">
            Message envoyé
          </h2>

          <p className="text-sm font-medium leading-relaxed text-emerald-800">
            Merci pour votre message. L’équipe AQ8 Algérie vous recontactera dès
            que possible selon la nature de votre demande.
          </p>

          <button
            type="button"
            onClick={() => setSubmitted(false)}
            className="mt-3 rounded-xl bg-[#353535] px-6 py-3 text-sm font-bold text-white transition-all hover:bg-[#ff5757] cursor-pointer"
          >
            Envoyer un autre message
          </button>
        </div>
      </div>
    );
  }

  return (
    <section className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm sm:p-8">
      <div className="mb-6 space-y-3">
        <span className="text-xs font-bold uppercase tracking-wider text-[#ff5757]">
          Formulaire de contact
        </span>

        <h2 className="font-display text-2xl font-bold text-[#353535]">
          Envoyer un message
        </h2>

        <p className="max-w-2xl text-sm font-medium leading-relaxed text-slate-600">
          Remplissez ce formulaire pour transmettre votre demande. Les champs
          marqués d’un astérisque sont nécessaires pour pouvoir vous recontacter.
        </p>
      </div>

      {errorMsg && (
        <div className="mb-5 rounded-2xl border border-rose-100 bg-rose-50 p-4 text-sm font-semibold text-rose-700">
          {errorMsg}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5 text-sm font-semibold text-slate-700">
        <div className="space-y-1.5">
          <label className="text-slate-600">Nom complet *</label>
          <input
            type="text"
            required
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Yacine Gherbi"
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-slate-900 outline-none transition-all focus:border-[#ff5757] focus:bg-white"
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label className="text-slate-600">Téléphone *</label>
            <input
              type="tel"
              required
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              placeholder="0660 44 88 99"
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-slate-900 outline-none transition-all focus:border-[#ff5757] focus:bg-white"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-slate-600">Adresse e-mail</label>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="yacine@email.com"
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-slate-900 outline-none transition-all focus:border-[#ff5757] focus:bg-white"
            />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label className="text-slate-600">Type de demande</label>
            <select
              value={requestType}
              onChange={(event) =>
                setRequestType(event.target.value as RequestType)
              }
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-slate-900 outline-none transition-all focus:border-[#ff5757] focus:bg-white"
            >
              {requestTypes.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-slate-600">Centre concerné</label>
            <select
              value={selectedCenter}
              onChange={(event) => setSelectedCenter(event.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-slate-900 outline-none transition-all focus:border-[#ff5757] focus:bg-white"
            >
              <option value="general">Demande générale</option>

              {centers.map((center) => (
                <option key={center.id} value={center.id}>
                  {center.name} — {center.city}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-slate-600">Votre message</label>
          <textarea
            rows={5}
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            placeholder="Bonjour, j’aimerais avoir plus d’informations sur..."
            className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-slate-900 outline-none transition-all focus:border-[#ff5757] focus:bg-white"
          />
        </div>

        <button
          type="submit"
          className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#ff5757] px-5 py-3 text-sm font-bold text-white shadow-md shadow-[#ff5757]/20 transition-all hover:bg-[#e94949] cursor-pointer"
        >
          <Send className="h-4 w-4" />
          Envoyer mon message
        </button>

        <p className="text-xs font-medium leading-relaxed text-slate-500">
          Cette version prépare la logique future Firebase. Pour l’instant, la
          demande est simulée côté interface et affichée dans la console.
        </p>
      </form>
    </section>
  );
}
