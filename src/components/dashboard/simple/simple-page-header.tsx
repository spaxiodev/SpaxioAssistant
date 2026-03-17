'use client';

type SimplePageHeaderProps = {
  title: string;
  description: string;
  icon?: React.ReactNode;
};

export function SimplePageHeader({ title, description, icon }: SimplePageHeaderProps) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        {icon && <span className="text-muted-foreground">{icon}</span>}
        <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
      </div>
      <p className="max-w-xl text-sm text-muted-foreground">{description}</p>
    </div>
  );
}
