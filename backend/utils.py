def consolidate_results(ai_responses: list, total_files_requested: int, skipped_files: list | None = None) -> dict:
    """
    Consolida las respuestas del análisis en un reporte maestro.
    """
    skipped_files = skipped_files or []

    master_report = {
        "total_score": 100,
        "files_analyzed": 0,
        "critical_issues": 0,
        "warnings": 0,
        "info_suggestions": 0,
        "findings": [],
        "skipped_files": skipped_files,
        "analyzed_files_requested": total_files_requested,
    }

    total_penalty = 0
    analyzed_count = 0

    for response in ai_responses:
        if response.get("analyzed", False):
            analyzed_count += 1

        findings = response.get("findings", [])
        for finding in findings:
            master_report["findings"].append(finding)

            severity = finding.get("severity")

            if severity == "critical":
                master_report["critical_issues"] += 1
                total_penalty += 20
            elif severity == "warning":
                master_report["warnings"] += 1
                total_penalty += 5
            elif severity == "info":
                master_report["info_suggestions"] += 1
                total_penalty += 1

    master_report["files_analyzed"] = analyzed_count
    master_report["total_score"] = max(0, 100 - total_penalty)

    return master_report
