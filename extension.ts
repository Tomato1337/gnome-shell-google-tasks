import type { GoogleTask } from './tasksManager.js';

import Clutter from 'gi://Clutter';
import GObject from 'gi://GObject';
import St from 'gi://St';

import { Extension } from 'resource:///org/gnome/shell/extensions/extension.js';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';

import { GoogleTasksManager } from './tasksManager.js';

const TasksSection = GObject.registerClass({
  GTypeName: 'GoogleTasksSection',
}, class TasksSection extends St.Button {
  private _titleLabel!: St.Label;
  private _tasksList!: St.BoxLayout;

  _init() {
    super._init({
      style_class: 'weather-button',
      can_focus: true,
      x_expand: true,
    });

    const box = new St.BoxLayout({
      style_class: 'weather-box',
      orientation: Clutter.Orientation.VERTICAL,
      x_expand: true,
    });
    this.set_child(box);

    const titleBox = new St.BoxLayout({ style_class: 'weather-header-box' });
    this._titleLabel = new St.Label({
      style_class: 'weather-header',
      text: 'Google Tasks',
      x_align: Clutter.ActorAlign.START,
      x_expand: true,
      y_align: Clutter.ActorAlign.END,
    });

    titleBox.add_child(this._titleLabel);
    box.add_child(titleBox);

    this._tasksList = new St.BoxLayout({
      style_class: 'tasks-list',
      orientation: Clutter.Orientation.VERTICAL,
      x_expand: true,
    });

    box.add_child(this._tasksList);
  }

  addTask(summary: string) {
    const box = new St.BoxLayout({
      style_class: 'task-box',
      orientation: Clutter.Orientation.VERTICAL,
    });

    box.add_child(new St.Label({
      text: summary,
    }));

    this._tasksList.add_child(box);
  }

  clearTasks() {
    this._tasksList.destroy_all_children();
  }
});

type TasksSectionInstance = InstanceType<typeof TasksSection>;

export default class GoogleTasksExtension extends Extension {
  private _tasksSection: TasksSectionInstance | null = null;
  private _tasksManager: GoogleTasksManager | null = null;

  enable() {
    this._tasksSection = new TasksSection();
    this._tasksManager = new GoogleTasksManager();
    const dateMenu = Main.panel.statusArea.dateMenu as any;
    if (!dateMenu) {
      Main.notify('Google Tasks Extension', 'Date menu not found');
      return;
    }

    const displaysSection = dateMenu._displaysSection;
    const displaysBox = displaysSection ? (displaysSection.get_child() as St.BoxLayout) : null;

    if (displaysBox) {
      displaysBox.add_child(this._tasksSection);
    }
    else {
      const parent = dateMenu._calendarColumn || dateMenu._calendar?.get_parent();
      if (parent)
        parent.add_child(this._tasksSection);
    }

    this._refreshTasks();
  }

  async _refreshTasks() {
    if (!this._tasksSection || !this._tasksManager) {
      Main.notify('Google Tasks Extension', 'Failed to init tasks section or manager.');
      return;
    }

    const tasks: GoogleTask[] = await this._tasksManager.getTasks();

    // Guard against being disabled while fetching
    if (!this._tasksSection || !this._tasksManager)
      return;

    this._tasksSection.clearTasks();

    if (tasks.length === 0) {
      this._tasksSection.addTask('No tasks found');
    }
    else {
      for (const task of tasks) {
        if (task.title) {
          this._tasksSection.addTask(task.title);
        }
      }
    }
  }

  disable() {
    if (this._tasksManager) {
      this._tasksManager.destroy();
      this._tasksManager = null;
    }

    if (this._tasksSection) {
      this._tasksSection.destroy();
      this._tasksSection = null;
    }
  }
}
