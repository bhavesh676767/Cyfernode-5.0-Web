export function Section({ as: Tag = 'section', children, ...props }) {
  return <Tag {...props}>{children}</Tag>
}
