from pathlib import Path
import json,plistlib,shutil
root=Path(__file__).resolve().parent
obj=json.loads((root/'tools/text-door/workflow-source.json').read_text())
out=root/'dist';out.mkdir(exist_ok=True)
(out/'textdoor-v2-UNSIGNED.shortcut').write_bytes(plistlib.dumps(obj,fmt=plistlib.FMT_BINARY))
html=next(x['WFWorkflowActionParameters']['WFTextActionText'] for x in obj['WFWorkflowActions'] if x['WFWorkflowActionIdentifier']=='is.workflow.actions.gettext')
(out/'textdoor-template.txt').write_text(html)
shutil.copyfile(root/'INSTALL.txt',out/'INSTALL.txt')
print('Built unsigned source package only. Apple signing and iPhone import are NOT verified.')
