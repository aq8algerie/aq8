import { redirect } from 'next/navigation';

export default function FaqRedirectPage() {
  redirect('/a-propos#faq');
}
