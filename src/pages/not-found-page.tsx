import { homePath } from '../routes/route-config'

export function NotFoundPage() {
  return (
    <div className="not-found">
      <a href={homePath} className="not-found__back" aria-label="Back to index" />
    </div>
  )
}
