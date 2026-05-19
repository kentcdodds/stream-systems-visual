import { visualizationRouteConfigs } from '../routes/route-config'

export function HomePage() {
  return (
    <div className="home">
      <ul className="home__list">
        {visualizationRouteConfigs.map((route, index) => (
          <li key={route.id}>
            <a
              href={route.path}
              className="home__tile"
              aria-label={route.ariaLabel}
            >
              <span className="home__tile-mark" data-index={index} />
              <span className="home__tile-label">{route.label}</span>
            </a>
          </li>
        ))}
      </ul>
    </div>
  )
}
