import type { Metadata } from "next";
import Link from "next/link";
import {
  BadgeCheck,
  Banknote,
  Building2,
  CalendarCheck,
  CircleAlert,
  Clock3,
  FileCheck2,
  HeartPulse,
  ReceiptText,
  RefreshCcw,
  Scale,
  ShieldCheck,
} from "lucide-react";
import {
  LegalAlert,
  LegalDocument,
  type LegalDocumentSection,
  legalLinkClass,
} from "@/components/legal/LegalDocument";
import { getServerPublicSettings } from "@/src/lib/serverPublicData";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Conditions générales de vente | AQ8 Algérie",
  description:
    "Conditions générales applicables aux réservations, séances, forfaits et paiements dans les centres AQ8 Algérie.",
};

const LEGAL_EMAIL = "aq8algerie@gmail.com";

export default async function TermsOfSalePage() {
  const settings = await getServerPublicSettings();
  const appName = settings?.appName || "AQ8 Algérie";
  const address = settings?.addressAlgérie || "12 Rue des Glycines, Hydra, Alger";
  const phone = settings?.contactPhone || "+213 795 12 84 09";

  const sections: LegalDocumentSection[] = [
    {
      id: "objet",
      label: "Objet et vendeur",
      title: "Objet et identification du prestataire",
      icon: Building2,
      content: (
        <>
          <p>
            Les présentes conditions générales de vente et de prestation de services
            encadrent les demandes de réservation effectuées sur le site ainsi que les
            séances et forfaits AQ8 EMS ou Wonder achetés auprès d’un centre du réseau
            <strong className="text-[#242424]"> {appName}</strong>.
          </p>
          <p>
            Le centre choisi assure la confirmation, l’encaissement et l’exécution de
            la prestation. Son identité opérationnelle, ses coordonnées, ses horaires
            et ses règles spécifiques sont présentés sur sa page publique et sur le reçu.
          </p>
          <dl className="grid gap-4 pt-1 sm:grid-cols-2">
            <div>
              <dt className="text-xs font-extrabold uppercase text-slate-400">Adresse réseau</dt>
              <dd className="font-semibold text-[#242424]">{address}</dd>
            </div>
            <div>
              <dt className="text-xs font-extrabold uppercase text-slate-400">Téléphone</dt>
              <dd className="font-semibold text-[#242424]">{phone}</dd>
            </div>
            <div>
              <dt className="text-xs font-extrabold uppercase text-slate-400">Contact</dt>
              <dd><a className={legalLinkClass} href={"mailto:" + LEGAL_EMAIL}>{LEGAL_EMAIL}</a></dd>
            </div>
          </dl>
          <LegalAlert title="Informations contractuelles à compléter">
            <p>
              La direction doit encore renseigner la raison sociale, la forme juridique,
              le RC, le NIF/NIS et identifier l’entité qui encaisse pour chaque centre.
              Ces informations doivent être validées avant publication juridique définitive.
            </p>
          </LegalAlert>
        </>
      ),
    },
    {
      id: "services",
      label: "Services proposés",
      title: "Prestations et disponibilité",
      icon: BadgeCheck,
      content: (
        <>
          <p>
            Les centres proposent des séances AQ8 EMS, Wonder et, selon leur offre,
            des formules combinées ou des forfaits de plusieurs séances. La description,
            la durée, le nombre de crédits et les éventuelles restrictions sont
            communiqués avant le paiement.
          </p>
          <p>
            Les technologies et forfaits disponibles, la capacité d’accueil et les
            horaires varient selon le centre. Une disponibilité affichée peut évoluer
            jusqu’à la confirmation définitive par l’équipe du centre.
          </p>
        </>
      ),
    },
    {
      id: "reservation",
      label: "Réservation",
      title: "Étapes de la réservation en ligne",
      icon: CalendarCheck,
      content: (
        <>
          <ol className="list-decimal space-y-2 pl-5 marker:font-extrabold marker:text-[#ff5757]">
            <li>le client choisit un centre, une technologie, une date et une heure ;</li>
            <li>un récapitulatif lui permet de vérifier les informations saisies ;</li>
            <li>l’envoi de la demande bloque provisoirement une place selon la capacité disponible ;</li>
            <li>le centre examine la demande et adresse une acceptation ou un refus ;</li>
            <li>la réservation devient définitive uniquement après confirmation du centre.</li>
          </ol>
          <p>
            L’accusé automatique de réception ne vaut ni acceptation définitive, ni
            encaissement, ni garantie de disponibilité. Aucun paiement n’est déclenché
            par le formulaire public actuel.
          </p>
        </>
      ),
    },
    {
      id: "prix",
      label: "Prix",
      title: "Prix et information préalable",
      icon: Banknote,
      content: (
        <>
          <p>
            Les prix sont exprimés en dinars algériens (DZD), toutes taxes applicables
            comprises. Ils peuvent varier selon le centre, la technologie, le format de
            séance, le forfait ou une offre promotionnelle clairement identifiée.
          </p>
          <p>
            Le prix définitif doit être présenté au client avant l’encaissement. En cas
            de différence entre une information générale du site et le prix configuré
            pour le centre, le centre doit informer le client et recueillir son accord
            avant tout paiement. Aucune modification rétroactive ne peut être appliquée.
          </p>
        </>
      ),
    },
    {
      id: "sante",
      label: "Aptitude et sécurité",
      title: "Aptitude, précautions et contre-indications",
      icon: HeartPulse,
      content: (
        <>
          <p>
            Les prestations AQ8 et Wonder ne remplacent ni un diagnostic, ni un suivi,
            ni un traitement médical. Le client doit signaler au personnel habilité
            toute situation susceptible d’affecter la sécurité de la séance et demander
            l’avis d’un professionnel de santé en cas de doute.
          </p>
          <p>
            Le centre peut reporter ou refuser une séance lorsqu’il estime que les
            conditions de sécurité ne sont pas réunies. Le client s’engage à suivre les
            consignes du personnel, à utiliser l’équipement demandé et à fournir des
            informations exactes sur sa situation.
          </p>
        </>
      ),
    },
    {
      id: "paiement",
      label: "Paiement et reçu",
      title: "Paiement, activation et preuve",
      icon: ReceiptText,
      content: (
        <>
          <p>
            Les paiements sont actuellement finalisés avec le centre. Les moyens acceptés
            peuvent inclure espèces, carte, CCP ou chèque selon l’équipement et la politique
            du centre. Le site public ne collecte pas de numéro de carte bancaire.
          </p>
          <p>
            Un forfait est activé dans le CRM après validation de l’encaissement. Le client
            doit recevoir un reçu indiquant au minimum le centre, la date, le montant, le
            moyen de paiement et la prestation ou le forfait concerné. Le reçu constitue
            la preuve de l’opération enregistrée.
          </p>
        </>
      ),
    },
    {
      id: "forfaits",
      label: "Forfaits et crédits",
      title: "Utilisation des forfaits",
      icon: Clock3,
      content: (
        <>
          <p>
            Les forfaits sont rattachés au client et au centre qui les a activés. Sauf
            accord écrit du centre, ils sont personnels et ne peuvent pas être cédés.
            Chaque séance effectivement validée déduit un crédit compatible avec la
            technologie utilisée.
          </p>
          <p>
            Le CRM applique actuellement une durée de validité de 45 jours à compter de
            la date d’activation ou d’achat enregistrée. Cette durée doit être clairement
            communiquée avant le paiement et rappelée sur le support remis au client.
            Toute condition plus favorable accordée par écrit par le centre reste applicable.
          </p>
        </>
      ),
    },
    {
      id: "annulation",
      label: "Annulation et absence",
      title: "Annulation, retard et absence",
      icon: RefreshCcw,
      content: (
        <>
          <p>
            La règle d’annulation propre au centre est affichée sur sa page et peut être
            rappelée dans l’e-mail de confirmation. Le client doit prévenir le centre dans
            le délai annoncé. À défaut de règle particulière communiquée, une annulation
            au moins une heure avant la séance est attendue.
          </p>
          <p>
            Une absence ou une annulation hors délai peut entraîner la déduction d’un crédit
            lorsque cette conséquence a été portée à la connaissance du client. Aucun crédit
            ne doit être déduit lorsque le centre annule la séance ou ne peut pas l’exécuter.
            Le centre peut proposer un nouveau créneau équivalent.
          </p>
        </>
      ),
    },
    {
      id: "retractation",
      label: "Rétractation et remboursement",
      title: "Rétractation, résiliation et remboursement",
      icon: FileCheck2,
      content: (
        <>
          <p>
            Le formulaire public ne réalise actuellement aucune vente payée en ligne. Une
            demande d’annulation transmise avant la confirmation définitive met fin à la
            pré-réservation sans frais.
          </p>
          <p>
            Pour une prestation ou un forfait déjà payé, toute demande de rétractation,
            résiliation ou remboursement est examinée par le centre selon l’état d’exécution,
            les séances déjà consommées, les conditions communiquées avant paiement et les
            droits impératifs du consommateur. Aucune clause ne peut supprimer un droit
            accordé par la législation applicable.
          </p>
          <p>
            <a className={legalLinkClass} href="https://www.joradp.dz/FTP/jo-francais/2018/F2018035.pdf" target="_blank" rel="noreferrer">
              Consulter la loi n° 18-09 relative à la protection du consommateur
            </a>
          </p>
        </>
      ),
    },
    {
      id: "responsabilites",
      label: "Responsabilités",
      title: "Engagements des parties",
      icon: ShieldCheck,
      content: (
        <>
          <p>
            Le centre s’engage à fournir la prestation confirmée avec diligence, à respecter
            les capacités annoncées, à assurer la traçabilité des paiements et à protéger les
            informations confiées. Le client s’engage à fournir des informations exactes, à
            respecter le créneau, les consignes de sécurité et les autres usagers.
          </p>
          <p>
            Les résultats physiques dépendent de nombreux facteurs individuels. Les contenus
            du site et les explications commerciales ne constituent pas une garantie de résultat.
            La responsabilité ne peut être limitée lorsqu’une disposition impérative l’interdit.
          </p>
        </>
      ),
    },
    {
      id: "reclamation",
      label: "Réclamations",
      title: "Réclamations et règlement des différends",
      icon: CircleAlert,
      content: (
        <>
          <p>
            Toute réclamation doit d’abord être adressée au centre concerné avec les éléments
            utiles : identité, date de séance, référence de réservation et copie du reçu le cas
            échéant. Une réclamation réseau peut être envoyée à{" "}
            <a className={legalLinkClass} href={"mailto:" + LEGAL_EMAIL}>{LEGAL_EMAIL}</a>.
          </p>
          <p>
            Les parties rechercheront une solution amiable. À défaut, le litige relève des
            juridictions compétentes conformément au droit algérien et aux règles de procédure
            applicables.
          </p>
        </>
      ),
    },
    {
      id: "force-majeure",
      label: "Force majeure",
      title: "Indisponibilité et force majeure",
      icon: CircleAlert,
      content: (
        <p>
          Un centre peut devoir reporter une séance en cas de panne, indisponibilité du personnel,
          mesure administrative, événement extérieur imprévisible ou autre cas de force majeure.
          Le client en est informé dès que possible et un report ou une solution adaptée lui est proposé.
        </p>
      ),
    },
    {
      id: "acceptation",
      label: "Acceptation et droit",
      title: "Acceptation, évolution et droit applicable",
      icon: Scale,
      content: (
        <>
          <p>
            Le client doit pouvoir consulter les présentes CGV avant toute conclusion de vente.
            L’envoi d’une pré-réservation confirme seulement qu’il en a pris connaissance ; le
            contrat relatif à la prestation se forme après confirmation du centre et accord sur le prix.
          </p>
          <p>
            Les CGV peuvent évoluer. La version applicable est celle portée à la connaissance du
            client lors de la confirmation ou de l’achat. Elles sont soumises au droit algérien,
            notamment à la loi n° 18-05 relative au commerce électronique.
          </p>
          <p>
            <a className={legalLinkClass} href="https://www.joradp.dz/FTP/jo-francais/2018/F2018028.pdf" target="_blank" rel="noreferrer">
              Consulter la loi n° 18-05 relative au commerce électronique
            </a>
          </p>
          <p>
            Consultez également la{" "}
            <Link className={legalLinkClass} href="/politique-de-confidentialite">politique de confidentialité</Link>.
          </p>
        </>
      ),
    },
  ];

  return (
    <LegalDocument
      eyebrow="Réservations et prestations"
      title="Conditions générales de vente"
      description="Ces conditions expliquent le parcours de réservation, le paiement en centre, l’utilisation des forfaits et les règles applicables aux séances AQ8 et Wonder."
      updatedAt="29 juillet 2026"
      sections={sections}
    />
  );
}
