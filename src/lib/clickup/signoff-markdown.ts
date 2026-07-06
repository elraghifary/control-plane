export interface SignoffPerson {
  name: string;
  email: string;
}

export interface SignoffService {
  service: string;
  version: string;
  type: string;
  pic: SignoffPerson;
}

export interface SignoffTaskRow {
  name: string;
  url: string;
  assigneeEmails: string[];
}

export interface SignoffMemberRow extends SignoffPerson {
  date: string;
}

export interface SignoffInput {
  deploymentDate: string;
  sprintName: string;
  services: SignoffService[];
  tasks: SignoffTaskRow[];
  qaMembers: SignoffMemberRow[];
  productMembers: SignoffMemberRow[];
  postDeployExecuted: boolean;
  postDeploySmokeTest: boolean;
  postDeployMonitoring: boolean;
  notes: string;
  contact: SignoffPerson;
}

function mailtoLink(person: SignoffPerson): string {
  return `[${person.name}](mailto:${person.email})`;
}

function checkbox(checked: boolean): string {
  return checked ? "[x]" : "[ ]";
}

export function buildSignoffMarkdown(input: SignoffInput): string {
  const serviceRows = input.services
    .map((s) => `| ${s.service} | ${s.version} | ${s.type} |  | ${mailtoLink(s.pic)} |`)
    .join("\n");

  const taskRows = input.tasks
    .map((t) => {
      const assignees = t.assigneeEmails.map((email) => `[${email}](mailto:${email})`).join(", ");
      return `| [${t.name}](${t.url}) | ${assignees} |`;
    })
    .join("\n");

  const qaRows = input.qaMembers
    .map((m) => `| ${mailtoLink(m)} | ${m.date} |  |  |`)
    .join("\n");

  const productRows = input.productMembers
    .map((m) => `| ${mailtoLink(m)} | ${m.date} |  |  |`)
    .join("\n");

  return `# **Deployment Services Sign-off**
This document serves as a formal sign-off for the deployment of all services. Approval from both the Quality Assurance (QA) and Product teams is required before proceeding with deployment.

# **Deployment Information**
**Deployment Date:** ${input.deploymentDate}
**Deployment Sprints:** ${input.sprintName}
**Deployment Scope:**
| HappyKids Services | Version | Type | Post-Deploy Checked | PIC |
| :---- | :---- | :---- | :---: | :---- |
${serviceRows}

# **Task List**

| Task | Assignees |
| :---- | :---- |
${taskRows}

# **Sign-off Approvals**

## Quality Assurance (QA) Team

The QA team confirms that all testing, including functional, integration, and end-to-end flow, has been completed successfully and that the deployed components meet the defined quality standards.
Environment Staging and/or Test Flight

### Quality Assurance (QA) Verification Checklist

- [ ] All functional tests passed in Staging
- [ ] No critical/blocker issues open
- [ ] Regression testing
- [ ] Test evidence attached to ticket (screenshots, video, reports)
- [ ] Rollback plan verified (coordinate with the engineer)

| QA Team Member | Date | Approval | Comment |
| :---- | :---- | ----- | :---- |
${qaRows}

## Product Team

The Product team confirms that the deployed components align with the product requirements and business objectives, and are ready for release to end-users.

### Product Verification Checklist

- [ ] Feature aligns with user story & acceptance criteria
- [ ] No missing scope from the sprint agreement
- [ ] User impact reviewed & communicated (email, wa, etc)

| Product Team Member | Date | Approval | Comments |
| :---- | :---- | ----- | :---- |
${productRows}

# Post-Deployment Confirmation

The following items have been verified and confirmed prior to this sign-off:

- ${checkbox(input.postDeployExecuted)} Deployment executed successfully
- ${checkbox(input.postDeploySmokeTest)} Smoke test on production passed
- ${checkbox(input.postDeployMonitoring)} Monitoring & error logs checked

# Note / Remarks

${input.notes || "_None._"}

# Next Steps

Upon receiving all required approvals, the deployment process will proceed as scheduled. For any questions or concerns regarding this sign-off, please contact ${mailtoLink(input.contact)}.
`;
}

export function buildSignoffShareMessage(sprintName: string, docUrl: string): string {
  return `${docUrl}

🚀 Thread Deployment – ${sprintName}

@tech-team @product-team

Halo semua! Mohon bantuannya untuk cek dan update status deployment di thread ini ya.

Pre-deployment:

🔎 Double check environment sesuai docs
🗄️ Pastikan perubahan DDL atau DML sudah sesuai
🧠 Cek kebutuhan redis, kafka, feature flag, permission, atau config lain
🧪 Pastikan sudah dites secukupnya (minimal happy case)

Post-deployment:

✅ Lakukan pengecekan langsung di production (login, buat order, buat appointment, dll sesuai task)
👀 Pastikan tidak ada bug atau test case yang terlewat
📝 Update hasil pengecekan di thread ini (bug, rollback, dll)

Terima kasih! 🙌
`;
}
