import Adw from 'gi://Adw';
import Gio from 'gi://Gio';
import Gtk from 'gi://Gtk';

import { ExtensionPreferences } from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';

const REFRESH_INTERVAL_KEY = 'refresh-interval';

export default class GoogleTasksPreferences extends ExtensionPreferences {
  async fillPreferencesWindow(window: Adw.PreferencesWindow): Promise<void> {
    const settings = this.getSettings();

    const page = new Adw.PreferencesPage();
    const group = new Adw.PreferencesGroup({
      title: 'General',
    });

    const refreshIntervalRow = new Adw.SpinRow({
      title: 'Refresh interval',
      subtitle: 'How often to sync tasks (seconds). Note: Google Tasks API has a quota of 50,000 requests per day.',
      adjustment: new Gtk.Adjustment({
        lower: 5,
        upper: 3600,
        step_increment: 5,
        page_increment: 30,
      }),
      digits: 0,
      numeric: true,
    });

    settings.bind(REFRESH_INTERVAL_KEY, refreshIntervalRow, 'value', Gio.SettingsBindFlags.DEFAULT);

    group.add(refreshIntervalRow);
    page.add(group);
    window.add(page);
  }
}
