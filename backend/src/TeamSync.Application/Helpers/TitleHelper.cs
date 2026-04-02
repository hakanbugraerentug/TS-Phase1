namespace TeamSync.Application.Helpers;

public static class TitleHelper
{
    public static bool IsElevatedTitle(string title)
    {
        var t = title.ToLowerInvariant();
        return t.Contains("müdür") || t.Contains("mudur") || t.Contains("manager") ||
               t.Contains("direktör") || t.Contains("direktor") || t.Contains("director") ||
               t.Contains("başkan") || t.Contains("baskan") || t.Contains("head") ||
               t.Contains("chief") || t.Contains("genel müdür") || t.Contains("genel mudur");
    }
}
