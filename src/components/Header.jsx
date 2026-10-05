import { CloudSun } from '@phosphor-icons/react/dist/csr/CloudSun';
import LanguageSelect from './LanguageSelect';
import { TopNav } from './Navigation';
import UnitToggle from './UnitToggle';

export default function Header({ view }) {
  return (
    <header className="relative z-20 pt-[env(safe-area-inset-top)]">
      <div className="mx-auto flex h-20 max-w-6xl items-center justify-between gap-4 px-5 sm:px-8 lg:px-10">
        <a href="#/" className="on-sky flex items-center gap-2 rounded-lg text-xl font-bold tracking-tight">
          <CloudSun size={28} weight="duotone" className="text-amber-300" aria-hidden />
          Cloudbase
        </a>
        <TopNav view={view} />
        <div className="flex items-center gap-2">
          <LanguageSelect />
          <UnitToggle />
        </div>
      </div>
    </header>
  );
}
