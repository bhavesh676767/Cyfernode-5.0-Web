import { Link } from 'react-router-dom'
import { cn } from '@/utils/cn'
import styles from './Button.module.css'

export function Button({
  to,
  href,
  variant = 'solid',
  className,
  children,
  ...props
}) {
  const classNames = cn(styles.button, variant === 'ghost' && styles.ghost, className)

  if (to) {
    return (
      <Link to={to} className={classNames} {...props}>
        {children}
      </Link>
    )
  }

  if (href) {
    return (
      <a href={href} className={classNames} {...props}>
        {children}
      </a>
    )
  }

  return (
    <button type="button" className={classNames} {...props}>
      {children}
    </button>
  )
}
