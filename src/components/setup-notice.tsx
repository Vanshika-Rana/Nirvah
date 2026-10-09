export function SetupNotice() {
  return (
    <div className="mb-4 rounded-2xl border border-warning/30 bg-warning-soft px-4 py-3 text-sm text-warning">
      Supabase is not configured yet. The app UI is available, but financial data will not sync until you add environment variables and run the SQL migration. See the README.
    </div>
  );
}
