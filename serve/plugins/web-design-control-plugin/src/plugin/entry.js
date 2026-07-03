plugin.entry = {
  mount: function mount(container, rawOptions) {
    if (!container) {
      throw new Error("mount_container_required");
    }

    var options = plugin.mergeOptions(rawOptions);
    var existing = plugin.instances.get(container);
    if (existing) {
      existing.destroy();
      plugin.instances.delete(container);
    }

    var apiClient = plugin.createApiClient(options);
    var instance = plugin.render(container, options, apiClient);
    plugin.instances.set(container, instance);
    return instance;
  },

  unmount: function unmount(container) {
    var existing = plugin.instances.get(container);
    if (!existing) {
      return;
    }

    existing.destroy();
    plugin.instances.delete(container);
  }
};
