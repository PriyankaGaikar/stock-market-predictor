import Card from "../components/Card";

export default function ComingSoon({ title, icon: Icon, description, items = [] }) {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">{title}</h1>
      <Card>
        <div className="flex flex-col items-center px-4 py-10 text-center">
          {Icon && <Icon className="h-10 w-10 text-slate-400" aria-hidden="true" />}
          <p className="mt-3 text-base font-medium">This page is built in the next phase.</p>
          <p className="mt-1 max-w-xl text-sm text-slate-500 dark:text-slate-400">{description}</p>
          {items.length > 0 && (
            <ul className="mt-4 list-disc space-y-1 pl-5 text-left text-sm text-slate-600 dark:text-slate-300">
              {items.map((i) => (
                <li key={i}>{i}</li>
              ))}
            </ul>
          )}
        </div>
      </Card>
    </div>
  );
}