type JsonLdProps = {
  data: Record<string, any> | Record<string, any>[];
  id?: string;
};

export function JsonLd({ data, id }: JsonLdProps) {
  if (!data) return null;

  const json = Array.isArray(data) ? data : [data];

  return (
    <script
      type="application/ld+json"
      id={id}
      // JSON-LD is safe to stringify; content is controlled by us
      dangerouslySetInnerHTML={{ __html: JSON.stringify(json) }}
    />
  );
}

