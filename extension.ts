import type { GoogleTask } from './tasksManager.js';

import Clutter from 'gi://Clutter';
import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
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
      x_expand: true,
      can_focus: false,
      layout_manager: new Clutter.BoxLayout({ orientation: Clutter.Orientation.VERTICAL }),
    });

    const box = new St.BoxLayout({
      style_class: 'weather-box',
      orientation: Clutter.Orientation.VERTICAL,
      x_expand: true,
    });
    this.add_child(box);

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

  addTask(task: GoogleTask, onComplete?: (task: GoogleTask) => void) {
    const box = new St.BoxLayout({
      style_class: 'task-box',
      orientation: Clutter.Orientation.HORIZONTAL,
      y_align: Clutter.ActorAlign.CENTER,
    });

    const radio = new St.Button({
      style_class: 'task-radio',
      can_focus: true,
      y_align: Clutter.ActorAlign.CENTER,
    });

    const checkIcon = new St.Icon({
      icon_name: 'object-select-symbolic',
      style_class: 'task-radio-check',
      icon_size: 8,
    });
    checkIcon.opacity = 0;
    radio.set_child(checkIcon);

    radio.connect('notify::hover', () => {
      if (!radio.has_style_class_name('task-radio-completed'))
        checkIcon.opacity = radio.hover ? 255 : 0;
    });

    const label = new St.Label({
      text: task.title,
      style_class: 'task-label',
      y_align: Clutter.ActorAlign.CENTER,
    });

    radio.connect('clicked', () => {
      radio.add_style_class_name('task-radio-completed');
      checkIcon.opacity = 255;
      label.add_style_class_name('task-label-completed');
      radio.reactive = false;
      if (onComplete)
        onComplete(task);
    });

    box.add_child(radio);
    box.add_child(label);

    this._tasksList.add_child(box);
  }

  clearTasks() {
    this._tasksList.destroy_all_children();
  }
});

type TasksSectionInstance = InstanceType<typeof TasksSection>;

const REFRESH_INTERVAL_SECONDS = 20; // 20 seconds

export default class GoogleTasksExtension extends Extension {
  private _tasksSection: TasksSectionInstance | null = null;
  private _tasksManager: GoogleTasksManager | null = null;
  private _refreshTimerId: number | null = null;

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

    this._tasksSection.connect('clicked', () => {
      Gio.AppInfo.launch_default_for_uri('https://tasks.google.com/', null);
      dateMenu.menu.close();
    });

    this._refreshTasks();
    this._startRefreshTimer();
  }

  _startRefreshTimer() {
    this._stopRefreshTimer();
    this._refreshTimerId = GLib.timeout_add_seconds(GLib.PRIORITY_DEFAULT, REFRESH_INTERVAL_SECONDS, () => {
      this._refreshTasks();
      return GLib.SOURCE_CONTINUE;
    });
  }

  _stopRefreshTimer() {
    if (this._refreshTimerId !== null) {
      GLib.source_remove(this._refreshTimerId);
      this._refreshTimerId = null;
    }
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
      this._tasksSection.addTask({ id: '', title: 'No tasks found', status: 'none' });
    }
    else {
      for (const task of tasks) {
        if (task.title) {
          this._tasksSection.addTask(task, t => this._onTaskCompleted(t));
        }
      }
    }
  }

  async _onTaskCompleted(task: GoogleTask) {
    if (!this._tasksManager || !task.taskListId)
      return;

    try {
      await this._tasksManager.completeTask(task.taskListId, task.id);
      // Brief delay so the completed animation is visible before refreshing
      GLib.timeout_add(GLib.PRIORITY_DEFAULT, 100, () => {
        this._refreshTasks();
        return GLib.SOURCE_REMOVE;
      });
    }
    catch (e) {
      console.error(`Google Tasks: Failed to mark task completed: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  disable() {
    this._stopRefreshTimer();

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
