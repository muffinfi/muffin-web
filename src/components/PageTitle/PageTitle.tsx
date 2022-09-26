import { Helmet } from 'react-helmet-async'

export default function PageTitle({ title }: { title?: string }) {
  return <Helmet title={title ? `${title} - Muffin` : 'Muffin'} />
}
