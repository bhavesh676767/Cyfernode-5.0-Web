import { cn } from '@/utils/cn'
import styles from './Container.module.css'

export function Container({ as: Tag = 'div', className, children, ...props }) {
  return (
    <Tag className={cn(styles.container, className)} {...props}>
      {children}
    </Tag>
  )
}
