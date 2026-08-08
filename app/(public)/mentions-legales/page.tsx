import type { Metadata } from "next";
import Link from "next/link";
import {
  Building2,
  Database,
  FileText,
  Mail,
  Phone,
  Scale,
  ShieldCheck,
} from "lucide-react";
import { getServerPublicSettings } from "@/src/lib/serverPublicData";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Mentions légales | AQ8 Algérie",
  description:
    "Mentions légales, informations sur l’éditeur, l’hébergement et la protection des données du site AQ8 Algérie.",
};

const sections = [
  { id: "editeur", label: "Éditeur du site" },
  { id: "hebergement", label: "Hébergement" },
  { id: "propriete-intellectuelle", label: "Propriété intellectuelle" },
  { id: "responsabilite", label: "Responsabilité" },
  { id: "donnees-personnelles", label: "Données personnelles" },
  { id: "traceurs", label: "Traceurs et services techniques" },
  { id: "droit-applicable", label: "Droit applicable" },
];

export default async function LegalNoticePage() {
  const settings = await getServerPublicSettings();
  const appName = settings?.appName || "AQ8 Algérie";
  const email = "aq8algerie@gmail.com";
  const phone = settings?.contactPhone || "+213 795 12 84 09";
  const address = settings?.addressAlgérie || "12 Rue des Glycines, Hydra, Alger";

  return (
    <div className="mx-auto w-full max-w-6xl pb-12 sm:pb-16">
      <header className="border-b border-slate-200 py-8 sm:py-12">
        <div className="flex items-center gap-2 text-xs font-bold uppercase text-[#ff5757]">
          <Scale className="h-4 w-4" aria-hidden="true" />
          Informations juridiques
        </div>
        <h1 className="mt-4 font-display text-3xl font-black text-[#242424] sm:text-4xl">
          Mentions légales
        </h1>
        <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-600 sm:text-base">
          Cette page présente l’éditeur du site, ses conditions d’utilisation et
          les principes appliqués à la protection de vos données.
        </p>
        <p className="mt-3 text-xs font-semibold text-slate-400">
          Dernière mise à jour : 29 juillet 2026
        </p>
      </header>

      <div className="grid gap-10 py-8 lg:grid-cols-[220px_minmax(0,1fr)] lg:gap-16 lg:py-12">
        <aside className="lg:sticky lg:top-28 lg:self-start">
          <nav aria-label="Sommaire des mentions légales">
            <p className="mb-3 text-xs font-extrabold uppercase text-slate-400">
              Sur cette page
            </p>
            <ul className="border-l border-slate-200">
              {sections.map((section) => (
                <li key={section.id}>
                  <a
                    href={"#" + section.id}
                    className="block border-l-2 border-transparent py-2 pl-4 text-sm font-semibold text-slate-600 transition hover:border-[#ff5757] hover:text-[#242424]"
                  >
                    {section.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        </aside>

        <div className="min-w-0 divide-y divide-slate-200">
          <section id="editeur" className="scroll-mt-28 pb-9">
            <SectionTitle icon={Building2} number="01" title="Éditeur du site" />
            <div className="mt-5 space-y-3 text-sm leading-7 text-slate-600">
              <p>
                Le présent site est édité sous l’enseigne{" "}
                <strong className="text-[#242424]">{appName}</strong>, réseau de
                centres de remise en forme.
              </p>
              <div className="grid gap-3 pt-2 sm:grid-cols-2">
                <ContactLine icon={Building2} label="Adresse" value={address} />
                <ContactLine icon={Phone} label="Téléphone" value={phone} />
                <ContactLine icon={Mail} label="E-mail" value={email} href={"mailto:" + email} />
                <ContactLine
                  icon={FileText}
                  label="Site"
                  value="www.aq8algerie-dz.com"
                  href="https://www.aq8algerie-dz.com"
                />
              </div>
            </div>

            <div className="mt-6 border-l-4 border-amber-400 bg-amber-50 px-4 py-4 text-sm leading-6 text-amber-950">
              <p className="font-extrabold">Informations administratives à compléter</p>
              <p className="mt-1">
                La raison sociale, la forme juridique, le registre de commerce,
                les identifiants fiscaux, le siège social et l’identité du
                directeur de publication ne figurent pas encore dans les
                paramètres du projet. La direction doit les renseigner avant la
                validation juridique définitive de cette page.
              </p>
            </div>
          </section>

          <section id="hebergement" className="scroll-mt-28 py-9">
            <SectionTitle icon={Database} number="02" title="Hébergement" />
            <div className="mt-5 space-y-3 text-sm leading-7 text-slate-600">
              <p>
                Le site et ses services applicatifs sont hébergés avec Firebase
                App Hosting, un service exploité par Google LLC et reposant sur
                l’infrastructure Google Cloud.
              </p>
              <p>
                Les conditions et informations officielles du service sont
                consultables sur le site de{" "}
                <a
                  href="https://firebase.google.com/terms/"
                  target="_blank"
                  rel="noreferrer"
                  className="font-bold text-[#242424] underline decoration-slate-300 underline-offset-4 hover:text-[#ff5757]"
                >
                  Firebase
                </a>
                .
              </p>
            </div>
          </section>

          <section id="propriete-intellectuelle" className="scroll-mt-28 py-9">
            <SectionTitle icon={ShieldCheck} number="03" title="Propriété intellectuelle" />
            <div className="mt-5 space-y-3 text-sm leading-7 text-slate-600">
              <p>
                Les textes, marques, logos, photographies, éléments graphiques,
                interfaces et contenus présents sur ce site sont protégés par
                les règles applicables en matière de propriété intellectuelle.
              </p>
              <p>
                Toute reproduction, adaptation, représentation ou exploitation,
                totale ou partielle, est interdite sans autorisation écrite
                préalable de leur titulaire, sauf exceptions prévues par la loi.
              </p>
            </div>
          </section>

          <section id="responsabilite" className="scroll-mt-28 py-9">
            <SectionTitle icon={FileText} number="04" title="Responsabilité" />
            <div className="mt-5 space-y-3 text-sm leading-7 text-slate-600">
              <p>
                {appName} veille à fournir des informations exactes et à maintenir
                le service accessible. Les horaires, disponibilités, tarifs et
                informations des centres peuvent toutefois évoluer.
              </p>
              <p>
                Une demande de réservation envoyée depuis le site reste soumise
                à la confirmation du centre concerné. Elle ne constitue pas une
                réservation définitive tant que cette confirmation n’a pas été
                communiquée au client.
              </p>
            </div>
          </section>

          <section id="donnees-personnelles" className="scroll-mt-28 py-9">
            <SectionTitle icon={ShieldCheck} number="05" title="Données personnelles" />
            <div className="mt-5 space-y-4 text-sm leading-7 text-slate-600">
              <p>
                Les formulaires de réservation et de contact peuvent recueillir
                vos nom, prénom, téléphone, adresse e-mail, centre choisi,
                prestation, créneau souhaité et message. Ces données servent à
                traiter votre demande, organiser les capacités d’accueil,
                assurer le suivi client et sécuriser les opérations du CRM.
              </p>
              <p>
                Elles sont accessibles aux équipes autorisées du centre concerné
                et, lorsque nécessaire, à l’administration du réseau. Elles ne
                sont conservées que pendant la durée utile au traitement et aux
                obligations applicables.
              </p>
              <p>
                Conformément à la loi algérienne n° 18-07 du 10 juin 2018 relative
                à la protection des personnes physiques dans le traitement des
                données à caractère personnel, vous pouvez exercer vos droits
                d’accès, de rectification et d’opposition, ainsi que demander
                l’effacement lorsque celui-ci est applicable.
              </p>
              <p>
                Adressez votre demande à{" "}
                <a
                  href={"mailto:" + email}
                  className="font-bold text-[#242424] underline decoration-slate-300 underline-offset-4 hover:text-[#ff5757]"
                >
                  {email}
                </a>
                . Une preuve d’identité pourra être demandée lorsque cela est
                nécessaire pour protéger vos données.
              </p>
              <p>
                <a
                  href="https://www.joradp.dz/FTP/jo-francais/2018/F2018034.pdf"
                  target="_blank"
                  rel="noreferrer"
                  className="font-bold text-[#242424] underline decoration-slate-300 underline-offset-4 hover:text-[#ff5757]"
                >
                  Consulter le texte officiel de la loi n° 18-07
                </a>
              </p>
            </div>
          </section>

          <section id="traceurs" className="scroll-mt-28 py-9">
            <SectionTitle icon={Database} number="06" title="Traceurs et services techniques" />
            <div className="mt-5 space-y-3 text-sm leading-7 text-slate-600">
              <p>
                Le site utilise des services Firebase nécessaires à son
                fonctionnement, notamment pour l’authentification, la base de
                données, le stockage et l’hébergement. Ces services peuvent
                enregistrer des informations techniques indispensables à la
                sécurité et à la continuité du service.
              </p>
              <p>
                La mesure d’audience Firebase Analytics n’est pas activée par
                défaut. Tout ajout futur de traceurs non strictement nécessaires
                devra être accompagné d’une information et, lorsque requis, d’un
                mécanisme de consentement adapté.
              </p>
              <p>
                Pour comprendre le rôle de Google dans le traitement des données,
                consultez les{" "}
                <a
                  href="https://firebase.google.com/terms/data-processing-terms/"
                  target="_blank"
                  rel="noreferrer"
                  className="font-bold text-[#242424] underline decoration-slate-300 underline-offset-4 hover:text-[#ff5757]"
                >
                  conditions de traitement des données Firebase
                </a>
                .
              </p>
            </div>
          </section>

          <section id="droit-applicable" className="scroll-mt-28 pt-9">
            <SectionTitle icon={Scale} number="07" title="Droit applicable" />
            <div className="mt-5 space-y-3 text-sm leading-7 text-slate-600">
              <p>
                Le présent site et ses mentions légales sont soumis au droit
                algérien. En cas de différend, une solution amiable sera
                recherchée avant toute saisine des juridictions compétentes.
              </p>
              <p className="pt-2">
                Une question sur ces mentions ?{" "}
                <Link
                  href="/contact"
                  className="font-bold text-[#242424] underline decoration-slate-300 underline-offset-4 hover:text-[#ff5757]"
                >
                  Contacter AQ8 Algérie
                </Link>
                .
              </p>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

function SectionTitle({
  icon: Icon,
  number,
  title,
}: {
  icon: typeof Scale;
  number: string;
  title: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center bg-[#242424] text-white">
        <Icon className="h-4 w-4" aria-hidden="true" />
      </span>
      <div>
        <p className="text-[11px] font-extrabold uppercase text-[#ff5757]">{number}</p>
        <h2 className="font-display text-xl font-black text-[#242424] sm:text-2xl">{title}</h2>
      </div>
    </div>
  );
}

function ContactLine({
  icon: Icon,
  label,
  value,
  href,
}: {
  icon: typeof Building2;
  label: string;
  value: string;
  href?: string;
}) {
  const content = (
    <>
      <Icon className="mt-1 h-4 w-4 shrink-0 text-[#ff5757]" aria-hidden="true" />
      <span>
        <span className="block text-xs font-extrabold uppercase text-slate-400">{label}</span>
        <span className="font-semibold text-[#242424]">{value}</span>
      </span>
    </>
  );

  return href ? (
    <a href={href} className="flex min-w-0 gap-3 hover:text-[#ff5757]">
      {content}
    </a>
  ) : (
    <div className="flex min-w-0 gap-3">{content}</div>
  );
}
