export const VIP_EMAILS: string[] = [
    'holdacompany@gmail.com'
];

export function isVipUser(email?: string | null): boolean {
    if (!email) return false;
    const normalized = email.toLowerCase().trim();
    return VIP_EMAILS.map(e => e.toLowerCase().trim()).includes(normalized);
}
