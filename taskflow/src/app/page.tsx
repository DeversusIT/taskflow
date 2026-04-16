import { redirect } from 'next/navigation'

// La logica auth + workspace creation è nel layout (dashboard)
export default function Home() {
  redirect('/workspace/settings')
}
