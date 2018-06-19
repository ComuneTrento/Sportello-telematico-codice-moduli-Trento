import sublime_plugin

# Options are: "Windows", "Unix", "CR" (don't use CR)
PREFERRED_LINEENDINGS = "Windows"


class SilentlyChangeLineEndingsListener(sublime_plugin.EventListener):
    def on_pre_save(self, view):
        if view.line_endings() != PREFERRED_LINEENDINGS:
            view.set_line_endings(PREFERRED_LINEENDINGS)