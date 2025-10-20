import { FrappeForm } from "@anygridtech/frappe-types/client/frappe/core";
declare global {
    interface Window {
        cur_frm?: FrappeForm;
        frappe: any;
    }
    const frappe: any;
    const cur_frm: FrappeForm;
    const __: (text: string) => string;
    const workflow_history: {
        load_history_field: () => Promise<void>;
    };
}
//# sourceMappingURL=frappe_workflow_history.d.ts.map