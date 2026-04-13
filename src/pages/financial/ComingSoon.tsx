export default function ComingSoon({ title }: { title: string }) {
  return (
    <div className="p-6">
      <h1 className="text-xl font-bold text-gray-900 mb-4">{title}</h1>
      <p className="text-sm text-gray-500">Módulo em desenvolvimento...</p>
    </div>
  )
}
