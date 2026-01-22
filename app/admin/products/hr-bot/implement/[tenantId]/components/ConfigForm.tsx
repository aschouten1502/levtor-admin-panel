/**
 * ========================================
 * CONFIG FORM COMPONENT
 * ========================================
 *
 * Configuratie formulier voor embed opties.
 */

'use client';

import { EmbedConfig } from '../../types';

interface ConfigFormProps {
  config: EmbedConfig;
  onUpdate: (updates: Partial<EmbedConfig>) => void;
}

const LANGUAGES = [
  { code: 'nl', name: 'Nederlands' },
  { code: 'en', name: 'English' },
  { code: 'de', name: 'Deutsch' },
  { code: 'fr', name: 'Francais' },
  { code: 'es', name: 'Espanol' },
  { code: 'it', name: 'Italiano' },
  { code: 'pl', name: 'Polski' },
  { code: 'tr', name: 'Turkce' },
  { code: 'pt', name: 'Portugues' },
  { code: 'ro', name: 'Romana' },
  { code: 'ar', name: 'Arabic' },
  { code: 'zh', name: 'Chinese' },
];

export default function ConfigForm({ config, onUpdate }: ConfigFormProps) {
  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold text-gray-900">Configuratie</h3>

      {/* Dimensions */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Breedte</label>
          <div className="flex">
            <input
              type="number"
              value={config.width}
              onChange={(e) => onUpdate({ width: e.target.value })}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-l-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
              min="200"
              max="1200"
            />
            <select
              value={config.widthUnit}
              onChange={(e) => onUpdate({ widthUnit: e.target.value as 'px' | '%' })}
              className="px-3 py-2 border border-l-0 border-gray-300 rounded-r-lg bg-gray-50 text-sm"
            >
              <option value="px">px</option>
              <option value="%">%</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Hoogte</label>
          <div className="flex">
            <input
              type="number"
              value={config.height}
              onChange={(e) => onUpdate({ height: e.target.value })}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-l-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
              min="300"
              max="1200"
            />
            <select
              value={config.heightUnit}
              onChange={(e) => onUpdate({ heightUnit: e.target.value as 'px' | 'vh' })}
              className="px-3 py-2 border border-l-0 border-gray-300 rounded-r-lg bg-gray-50 text-sm"
            >
              <option value="px">px</option>
              <option value="vh">vh</option>
            </select>
          </div>
        </div>
      </div>

      {/* Preset Sizes */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Voorinstellingen</label>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => onUpdate({ width: '350', height: '500', widthUnit: 'px', heightUnit: 'px' })}
            className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Compact (350x500)
          </button>
          <button
            type="button"
            onClick={() => onUpdate({ width: '400', height: '600', widthUnit: 'px', heightUnit: 'px' })}
            className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Standaard (400x600)
          </button>
          <button
            type="button"
            onClick={() => onUpdate({ width: '100', height: '100', widthUnit: '%', heightUnit: 'vh' })}
            className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Volledig scherm
          </button>
          <button
            type="button"
            onClick={() => onUpdate({ width: '100', height: '500', widthUnit: '%', heightUnit: 'px' })}
            className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Volledige breedte
          </button>
        </div>
      </div>

      {/* Language */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Standaard taal</label>
        <select
          value={config.language}
          onChange={(e) => onUpdate({ language: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
        >
          {LANGUAGES.map((lang) => (
            <option key={lang.code} value={lang.code}>{lang.name}</option>
          ))}
        </select>
        <p className="mt-1 text-xs text-gray-500">
          Gebruikers kunnen de taal nog steeds wijzigen als de taalselector zichtbaar is.
        </p>
      </div>

      {/* Styling */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Border radius</label>
          <div className="flex items-center gap-3">
            <input
              type="range"
              min="0"
              max="32"
              value={config.borderRadius}
              onChange={(e) => onUpdate({ borderRadius: parseInt(e.target.value) })}
              className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
            />
            <span className="text-sm text-gray-600 w-12 text-right">{config.borderRadius}px</span>
          </div>
        </div>

        <div className="flex items-center gap-3 pt-6">
          <input
            type="checkbox"
            id="shadow"
            checked={config.shadow}
            onChange={(e) => onUpdate({ shadow: e.target.checked })}
            className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
          />
          <label htmlFor="shadow" className="text-sm font-medium text-gray-700">
            Schaduw
          </label>
        </div>
      </div>

      {/* Visibility Options */}
      <div className="space-y-3">
        <label className="block text-sm font-medium text-gray-700">Zichtbaarheid</label>

        <div className="flex items-center gap-3">
          <input
            type="checkbox"
            id="hideHeader"
            checked={config.hideHeader}
            onChange={(e) => onUpdate({ hideHeader: e.target.checked })}
            className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
          />
          <label htmlFor="hideHeader" className="text-sm text-gray-700">
            Header verbergen
          </label>
        </div>

        <div className="flex items-center gap-3">
          <input
            type="checkbox"
            id="hidePoweredBy"
            checked={config.hidePoweredBy}
            onChange={(e) => onUpdate({ hidePoweredBy: e.target.checked })}
            className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
          />
          <label htmlFor="hidePoweredBy" className="text-sm text-gray-700">
            &quot;Powered by&quot; verbergen
          </label>
        </div>
      </div>
    </div>
  );
}
