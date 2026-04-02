import { redirect } from 'next/navigation'

export default async function ConfirmationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  redirect(`/booking/${id}`)
}
