export default function InlineScript({ html }) {
  return (
    <script
      dangerouslySetInnerHTML={{ __html: html }}
      suppressHydrationWarning
    />
  );
}
