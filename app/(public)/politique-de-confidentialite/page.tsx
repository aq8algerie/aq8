import type { Metadata } from "next";
import {
  Building2,
  Cookie,
  Database,
  FileText,
  Globe2,
  HeartPulse,
  Mail,
  ShieldCheck,
  TimerReset,
  UserCheck,
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
  title: "Politique de confidentialité | AQ8 Algérie",
  description:
    "Politique de confidentialité du site public et du CRM AQ8 Algérie : données collectées, finalités, destinataires et droits.",
};

const PRIVACY_EMAIL = "aq8algerie@gmail.com";

export default async function PrivacyPolicyPage() {
  const settings = await getServerPublicSettings();
  const appName = settings?.appName || "AQ8 Algérie";
  const address = settings?.addressAlgérie || "12 Rue des Glycines, Hydra, Alger";
  const phone = settings?.contactPhone || "+213 795 12 84 09";

  const sections: LegalDocumentSection[] = [
    {
      id: "responsable",
      label: "Responsable du traitement",
      title: "Responsable du traitement",
      icon: Building2,
      content: (
        <>
          <p>
            Les traitements réalisés depuis le site public et le CRM sont placés
            sous la responsabilité de <strong className="text-[#242424]">{appName}</strong>{" "}
            et, pour la gestion opérationnelle d’une réservation, du centre AQ8
            choisi par le client.
          </p>
          <dl className="grid gap-4 pt-1 sm:grid-cols-2">
            <div>
              <dt className="text-xs font-extrabold uppercase text-slate-400">Adresse</dt>
              <dd className="font-semibold text-[#242424]">{address}</dd>
            </div>
            <div>
              <dt className="text-xs font-extrabold uppercase text-slate-400">Téléphone</dt>
              <dd className="font-semibold text-[#242424]">{phone}</dd>
            </div>
            <div>
              <dt className="text-xs font-extrabold uppercase text-slate-400">Contact vie privée</dt>
              <dd>
                <a className={legalLinkClass} href={"mailto:" + PRIVACY_EMAIL}>
                  {PRIVACY_EMAIL}
                </a>
              </dd>
            </div>
          </dl>
          <LegalAlert title="Identification juridique à finaliser">
            <p>
              La raison sociale exacte, la forme juridique, le RC, le NIF/NIS et
              l’identité officielle du responsable du traitement doivent être
              ajoutés par la direction avant validation juridique définitive.
            </p>
          </LegalAlert>
        </>
      ),
    },
    {
      id: "donnees-collectees",
      label: "Données collectées",
      title: "Données que nous traitons",
      icon: Database,
      content: (
        <>
          <p>Selon votre utilisation du service, les catégories suivantes peuvent être traitées :</p>
          <ul className="list-disc space-y-2 pl-5 marker:text-[#0284c7]">
            <li><strong className="text-[#242424]">Identité et contact :</strong> nom, prénom, téléphone, e-mail et date de naissance lorsqu’elle est renseignée.</li>
            <li><strong className="text-[#242424]">Réservation :</strong> centre, technologie, date, heure, statut, demandes et échanges associés.</li>
            <li><strong className="text-[#242424]">Suivi client :</strong> historique des séances, forfaits, crédits restants, objectifs et notes d’accompagnement.</li>
            <li><strong className="text-[#242424]">Paiement :</strong> montant, moyen de paiement, date et numéro de reçu. Le site public ne collecte actuellement aucune donnée de carte bancaire.</li>
            <li><strong className="text-[#242424]">Compte CRM :</strong> identifiant Firebase, rôle, centre de rattachement et traces d’audit des opérations sensibles.</li>
            <li><strong className="text-[#242424]">Données techniques :</strong> informations nécessaires à la sécurité, à la prévention des abus et au fonctionnement du service.</li>
          </ul>
          <p>
            Les données proviennent directement du client, d’un membre autorisé
            du centre ou des opérations réalisées dans le CRM. AQ8 Algérie ne vend
            pas les données personnelles de ses clients.
          </p>
        </>
      ),
    },
    {
      id: "donnees-sensibles",
      label: "Données de santé",
      title: "Données sensibles et accompagnement",
      icon: HeartPulse,
      content: (
        <>
          <p>
            Le CRM peut contenir des informations relatives à la condition physique,
            aux mensurations, aux antécédents déclarés, au groupe sanguin ou aux
            contre-indications. Ces informations sont sensibles et ne doivent être
            recueillies que lorsqu’elles sont utiles à la sécurité de la prestation,
            avec l’accord approprié de la personne concernée et un accès strictement limité.
          </p>
          <div className="border-l-4 border-[#0284c7] bg-rose-50 px-4 py-4 text-rose-950">
            <p className="font-extrabold">Important</p>
            <p className="mt-1">
              Les formulaires publics de réservation et de contact ne demandent pas
              de données médicales. N’insérez pas spontanément d’informations de
              santé dans le champ message. Elles doivent être communiquées directement
              au personnel habilité du centre lorsque cela est nécessaire.
            </p>
          </div>
        </>
      ),
    },
    {
      id: "finalites",
      label: "Finalités",
      title: "Pourquoi ces données sont utilisées",
      icon: FileText,
      content: (
        <ul className="list-disc space-y-2 pl-5 marker:text-[#0284c7]">
          <li>recevoir, examiner et confirmer les demandes de réservation ;</li>
          <li>organiser les capacités d’accueil et le planning de chaque centre ;</li>
          <li>gérer les clients, séances, forfaits, crédits, paiements et reçus ;</li>
          <li>envoyer les confirmations et notifications transactionnelles ;</li>
          <li>répondre aux demandes de contact et aux réclamations ;</li>
          <li>sécuriser les accès, prévenir les abus et conserver une piste d’audit ;</li>
          <li>respecter les obligations comptables, administratives et légales applicables.</li>
        </ul>
      ),
    },
    {
      id: "destinataires",
      label: "Destinataires",
      title: "Destinataires et prestataires",
      icon: UserCheck,
      content: (
        <>
          <p>
            Les données sont accessibles uniquement aux personnes qui en ont besoin :
            manager du centre concerné, personnel autorisé et super-administration du CRM.
            Les notifications peuvent être adressées au client, au manager du centre et,
            lorsque cette copie est activée, à l’administration du réseau.
          </p>
          <p>Les principaux prestataires techniques sont :</p>
          <ul className="list-disc space-y-2 pl-5 marker:text-[#0284c7]">
            <li>
              <a className={legalLinkClass} href="https://firebase.google.com/support/privacy" target="_blank" rel="noreferrer">Google Firebase</a>
              {" "}: authentification, base de données, stockage et hébergement ;
            </li>
            <li>
              <a className={legalLinkClass} href="https://resend.com/legal/privacy-policy" target="_blank" rel="noreferrer">Resend</a>
              {" "}: acheminement des e-mails transactionnels.
            </li>
          </ul>
          <p>
            Les données peuvent également être communiquées à une autorité lorsque
            la loi l’exige. Aucune autre transmission commerciale n’est prévue.
          </p>
        </>
      ),
    },
    {
      id: "conservation",
      label: "Conservation",
      title: "Durée de conservation",
      icon: TimerReset,
      content: (
        <>
          <p>
            Les données sont conservées pendant la durée nécessaire à la gestion de
            la demande, à la relation client et à la fourniture des prestations. Les
            écritures de paiement, reçus et traces d’audit peuvent être conservés plus
            longtemps lorsqu’une obligation légale, comptable, de preuve ou de sécurité
            le justifie.
          </p>
          <p>
            Lorsqu’une conservation n’est plus nécessaire, les données doivent être
            supprimées, anonymisées ou archivées avec un accès restreint. La direction
            AQ8 doit valider un calendrier de conservation détaillé et l’appliquer aux
            données historiques du CRM.
          </p>
        </>
      ),
    },
    {
      id: "droits",
      label: "Vos droits",
      title: "Vos droits sur vos données",
      icon: ShieldCheck,
      content: (
        <>
          <p>
            La loi algérienne n° 18-07 reconnaît notamment les droits à l’information,
            à l’accès, à la rectification et à l’opposition. L’actualisation,
            l’effacement ou le verrouillage peuvent également être demandés lorsque
            le traitement n’est pas conforme ou que la loi le permet.
          </p>
          <p>
            Pour exercer un droit, écrivez à{" "}
            <a className={legalLinkClass} href={"mailto:" + PRIVACY_EMAIL}>{PRIVACY_EMAIL}</a>
            {" "}en précisant votre demande et le centre concerné. Une preuve d’identité
            limitée au strict nécessaire pourra être demandée pour éviter toute
            communication à un tiers.
          </p>
          <p>
            <a className={legalLinkClass} href="https://www.joradp.dz/FTP/jo-francais/2018/F2018034.pdf" target="_blank" rel="noreferrer">
              Consulter le texte officiel de la loi n° 18-07
            </a>
          </p>
        </>
      ),
    },
    {
      id: "securite",
      label: "Sécurité",
      title: "Sécurité et confidentialité",
      icon: ShieldCheck,
      content: (
        <>
          <p>
            Le CRM applique une authentification Firebase, des rôles distincts entre
            manager et super-administrateur, un cloisonnement par centre, des règles
            Firestore et Storage, ainsi qu’une journalisation des opérations sensibles.
            Les validations de séance, déductions de crédit, activations de forfait et
            paiements utilisent des opérations transactionnelles côté serveur.
          </p>
          <p>
            Aucun dispositif ne garantit un risque nul. Tout incident suspect doit
            être signalé sans délai à{" "}
            <a className={legalLinkClass} href={"mailto:" + PRIVACY_EMAIL}>{PRIVACY_EMAIL}</a>.
          </p>
        </>
      ),
    },
    {
      id: "traceurs",
      label: "Cookies et traceurs",
      title: "Cookies et services techniques",
      icon: Cookie,
      content: (
        <>
          <p>
            Le site utilise les mécanismes techniques nécessaires à l’authentification,
            à la sécurité et à la continuité du service. Firebase Analytics est désactivé
            par défaut dans l’application.
          </p>
          <p>
            Si une mesure d’audience ou un autre traceur non indispensable est activé
            ultérieurement, une information claire et, lorsque requis, un mécanisme de
            consentement devront être proposés avant son dépôt.
          </p>
        </>
      ),
    },
    {
      id: "transferts",
      label: "Transferts et mineurs",
      title: "Traitements internationaux et mineurs",
      icon: Globe2,
      content: (
        <>
          <p>
            Firebase et Resend sont des prestataires internationaux. Certaines données
            techniques ou certains e-mails peuvent donc être traités en dehors de
            l’Algérie. Ces traitements doivent être encadrés par les garanties
            contractuelles et les formalités exigées par la réglementation applicable.
          </p>
          <p>
            Lorsqu’un mineur souhaite bénéficier d’une prestation, l’intervention de
            son représentant légal et l’évaluation préalable du centre peuvent être
            requises. Le mineur ne doit pas transmettre seul de données sensibles.
          </p>
        </>
      ),
    },
    {
      id: "contact",
      label: "Contact et mises à jour",
      title: "Contact et évolution de la politique",
      icon: Mail,
      content: (
        <>
          <p>
            Cette politique peut évoluer avec les services, les prestataires ou la
            réglementation. La date de mise à jour permet d’identifier la version en vigueur.
          </p>
          <p>
            Pour toute question :{" "}
            <a className={legalLinkClass} href={"mailto:" + PRIVACY_EMAIL}>{PRIVACY_EMAIL}</a>.
          </p>
        </>
      ),
    },
  ];

  return (
    <LegalDocument
      eyebrow="Protection de vos données"
      title="Politique de confidentialité"
      description="Cette politique explique quelles données sont utilisées par le site public et le CRM AQ8, pour quelles raisons, par qui et comment exercer vos droits."
      updatedAt="29 juillet 2026"
      sections={sections}
    />
  );
}
